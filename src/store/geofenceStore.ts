import { create } from 'zustand';

import {
  haversineDistance,
  isInsideGeofence,
} from '../engine/geoCalculator';
import {
  evaluateGeofenceEvent,
  getCurrentDeviceLocation,
  type LocationCoordinates,
  requestLocationPermissions,
  startBackgroundGeofenceTracking,
  stopBackgroundGeofenceTracking,
} from '../services/geofenceService';
import {
  initNotificationService,
  requestNotificationPermission,
  sendGeofenceNotification,
} from '../services/notificationService';
import {
  CompanyLocationConfig,
  DEFAULT_COMPANY_LOCATION,
  GeofenceEventType,
  GeofenceStatus,
  PendingAttendanceEvent,
} from '../types/geofence';
import {
  loadCompanyLocation,
  loadPendingEvents,
  saveCompanyLocation,
  savePendingEvents,
} from '../utils/persistence';
import { localDateKey } from '../utils/monthUtils';
import { useAttendanceStore } from './attendanceStore';

interface GeofenceState {
  config: CompanyLocationConfig;
  status: GeofenceStatus;
  pendingEvents: PendingAttendanceEvent[];
  isTracking: boolean;
  isLoading: boolean;

  // Actions
  initGeofence: () => Promise<void>;
  updateConfig: (patch: Partial<CompanyLocationConfig>) => Promise<void>;
  fetchCurrentLocation: () => Promise<LocationCoordinates | null>;
  checkLocationAndProcess: (coords?: LocationCoordinates) => Promise<PendingAttendanceEvent | null>;
  confirmEvent: (eventId: string) => Promise<void>;
  dismissEvent: (eventId: string) => Promise<void>;
  clearDismissedEvents: () => Promise<void>;
  startTracking: () => Promise<boolean>;
  stopTracking: () => Promise<void>;
}

const initialStatus: GeofenceStatus = {
  isInside: false,
  currentDistance: null,
  currentCoords: null,
  lastEventAt: null,
  lastEventType: null,
  locationPermission: 'undetermined',
  backgroundPermission: 'undetermined',
  notificationPermission: 'undetermined',
  error: null,
};

export const useGeofenceStore = create<GeofenceState>((set, get) => ({
  config: DEFAULT_COMPANY_LOCATION,
  status: initialStatus,
  pendingEvents: [],
  isTracking: false,
  isLoading: false,

  initGeofence: async () => {
    set({ isLoading: true });
    try {
      const savedConfig = await loadCompanyLocation();
      const savedEvents = await loadPendingEvents();

      const config = savedConfig || DEFAULT_COMPANY_LOCATION;
      set({
        config,
        pendingEvents: savedEvents || [],
      });

      // Initialize notification handler
      await initNotificationService((actionId, eventId) => {
        if (actionId.includes('CONFIRM')) {
          void get().confirmEvent(eventId);
        } else if (actionId.includes('DISMISS')) {
          void get().dismissEvent(eventId);
        }
      });

      if (config.enabled) {
        await get().fetchCurrentLocation();
      }
    } catch (err: any) {
      set((s) => ({ status: { ...s.status, error: err?.message || 'Init failed' } }));
    } finally {
      set({ isLoading: false });
    }
  },

  updateConfig: async (patch: Partial<CompanyLocationConfig>) => {
    const newConfig = { ...get().config, ...patch, updatedAt: new Date().toISOString() };
    set({ config: newConfig });
    await saveCompanyLocation(newConfig);

    if (newConfig.enabled) {
      await get().fetchCurrentLocation();
    } else {
      await get().stopTracking();
    }
  },

  fetchCurrentLocation: async () => {
    try {
      const perms = await requestLocationPermissions();
      const notifPerm = await requestNotificationPermission();

      set((s) => ({
        status: {
          ...s.status,
          locationPermission: perms.foreground,
          backgroundPermission: perms.background,
          notificationPermission: notifPerm ? 'granted' : 'denied',
        },
      }));

      const coords = await getCurrentDeviceLocation();
      if (!coords) {
        set((s) => ({
          status: {
            ...s.status,
            currentCoords: null,
            currentDistance: null,
            error: 'Không thể lấy tọa độ GPS hiện tại',
          },
        }));
        return null;
      }

      const { config } = get();
      const distance = haversineDistance(
        coords.latitude,
        coords.longitude,
        config.latitude,
        config.longitude
      );
      const isInside = isInsideGeofence(
        coords.latitude,
        coords.longitude,
        config.latitude,
        config.longitude,
        config.radius
      );

      set((s) => ({
        status: {
          ...s.status,
          currentCoords: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            mocked: coords.mocked,
          },
          currentDistance: Math.round(distance),
          isInside,
          error: null,
        },
      }));

      return coords;
    } catch (err: any) {
      set((s) => ({
        status: {
          ...s.status,
          error: err?.message || 'Lỗi khi lấy vị trí',
        },
      }));
      return null;
    }
  },

  checkLocationAndProcess: async (customCoords?: LocationCoordinates) => {
    const coords = customCoords || (await get().fetchCurrentLocation());
    if (!coords) return null;

    const { config, status, pendingEvents } = get();
    if (!config.enabled) return null;

    const now = new Date();
    const todayStr = localDateKey(now);
    const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayStr = localDateKey(yesterdayDate);

    // Get today and yesterday records from attendanceStore
    const attState = useAttendanceStore.getState();
    const todayRecord = attState.items.find((it) => it.date === todayStr) || null;
    const yesterdayRecord = attState.items.find((it) => it.date === yesterdayStr) || null;

    const lastEvent = pendingEvents[pendingEvents.length - 1];
    const lastEventTime = lastEvent ? new Date(lastEvent.detectedAt).getTime() : null;

    const result = evaluateGeofenceEvent({
      coords,
      config,
      wasInside: status.isInside,
      lastEventTime,
      todayRecord,
      yesterdayRecord,
      now,
    });

    set((s) => ({
      status: {
        ...s.status,
        isInside: result.isInside,
        currentDistance: Number.isNaN(result.distance) ? s.status.currentDistance : Math.round(result.distance),
      },
    }));

    if (result.event) {
      const newEvent = result.event;
      const updatedEvents = [...pendingEvents, newEvent];

      set((s) => ({
        pendingEvents: updatedEvents,
        status: {
          ...s.status,
          lastEventAt: newEvent.detectedAt,
          lastEventType: newEvent.type,
        },
      }));

      await savePendingEvents(updatedEvents);
      await sendGeofenceNotification(newEvent);

      return newEvent;
    }

    return null;
  },

  confirmEvent: async (eventId: string) => {
    const { pendingEvents } = get();
    const eventIndex = pendingEvents.findIndex((e) => e.id === eventId);
    if (eventIndex === -1) return;

    const event = pendingEvents[eventIndex];
    if (event.status !== 'PENDING') return;

    // Mark as confirmed
    const updated = { ...event, status: 'CONFIRMED' as const };
    const newEvents = [...pendingEvents];
    newEvents[eventIndex] = updated;

    set({ pendingEvents: newEvents });
    await savePendingEvents(newEvents);

    // Ensure attendance store is synchronized to the event's month
    const eventMonth = event.shiftDate.slice(0, 7);
    const attStore = useAttendanceStore.getState();
    if (attStore.month !== eventMonth) {
      await attStore.selectMonth(eventMonth);
    }

    const eventTime = new Date(event.detectedAt);
    const gpsMeta = {
      accuracy: event.accuracy,
      distance: event.distanceFromCompany,
      timestamp: event.detectedAt,
      latitude: event.latitude,
      longitude: event.longitude,
    };

    if (event.type === 'CHECK_IN') {
      await useAttendanceStore.getState().clockIn(eventTime, 'GEOFENCE_CONFIRMED', gpsMeta);
    } else if (event.type === 'CHECK_OUT') {
      await useAttendanceStore.getState().clockOut(eventTime, 'GEOFENCE_CONFIRMED', gpsMeta);
    }
  },

  dismissEvent: async (eventId: string) => {
    const { pendingEvents } = get();
    const eventIndex = pendingEvents.findIndex((e) => e.id === eventId);
    if (eventIndex === -1) return;

    const event = pendingEvents[eventIndex];
    if (event.status !== 'PENDING') return;

    // Mark as dismissed - ABSOLUTELY NO ATTENDANCE RECORD IS MODIFIED
    const updated = { ...event, status: 'DISMISSED' as const };
    const newEvents = [...pendingEvents];
    newEvents[eventIndex] = updated;

    set({ pendingEvents: newEvents });
    await savePendingEvents(newEvents);
  },

  clearDismissedEvents: async () => {
    const active = get().pendingEvents.filter((e) => e.status === 'PENDING');
    set({ pendingEvents: active });
    await savePendingEvents(active);
  },

  startTracking: async () => {
    const started = await startBackgroundGeofenceTracking();
    set({ isTracking: started });
    return started;
  },

  stopTracking: async () => {
    await stopBackgroundGeofenceTracking();
    set({ isTracking: false });
  },
}));
