jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestBackgroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 21.028511, longitude: 105.804817, accuracy: 10 },
  }),
  startLocationUpdatesAsync: jest.fn().mockResolvedValue(undefined),
  stopLocationUpdatesAsync: jest.fn().mockResolvedValue(undefined),
  Accuracy: { High: 6, Balanced: 3 },
}));

jest.mock('expo-task-manager', () => ({
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
  defineTask: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationCategoryAsync: jest.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notif-123'),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  addNotificationResponseReceivedListener: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

import {
  determineGeofenceTransition,
  haversineDistance,
  isInsideGeofence,
  isMockLocation,
  isValidGpsAccuracy,
} from '../src/engine/geoCalculator';
import {
  canCreateCheckIn,
  canCreateCheckOut,
  evaluateGeofenceEvent,
} from '../src/services/geofenceService';
import {
  CompanyLocationConfig,
  DEFAULT_COMPANY_LOCATION,
  PendingAttendanceEvent,
} from '../src/types/geofence';
import {
  loadCompanyLocation,
  loadPendingEvents,
  saveCompanyLocation,
  savePendingEvents,
} from '../src/utils/persistence';
import {
  sanitizeCompanyLocationConfig,
  sanitizePendingAttendanceEvent,
} from '../src/utils/securityValidator';
import { useGeofenceStore } from '../src/store/geofenceStore';
import { useAttendanceStore } from '../src/store/attendanceStore';

describe('Geofence & GPS Calculations Engine', () => {
  const companyLat = 21.028511;
  const companyLon = 105.804817;

  describe('haversineDistance', () => {
    it('returns 0 when coordinates are identical', () => {
      const dist = haversineDistance(companyLat, companyLon, companyLat, companyLon);
      expect(dist).toBeCloseTo(0, 1);
    });

    it('calculates accurate distance between known coordinates', () => {
      // 0.001 degrees latitude difference is approximately 111.19 meters
      const targetLat = 21.029511;
      const targetLon = 105.804817;
      const dist = haversineDistance(companyLat, companyLon, targetLat, targetLon);
      expect(dist).toBeGreaterThan(110);
      expect(dist).toBeLessThan(113);
    });

    it('returns NaN for invalid or non-finite inputs', () => {
      expect(haversineDistance(NaN, companyLon, companyLat, companyLon)).toBeNaN();
      expect(haversineDistance(companyLat, Infinity, companyLat, companyLon)).toBeNaN();
    });
  });

  describe('isInsideGeofence', () => {
    it('returns true when coordinates are within radius', () => {
      const insideLat = 21.029011; // ~55m away
      const insideLon = 105.804817;
      expect(isInsideGeofence(insideLat, insideLon, companyLat, companyLon, 150)).toBe(true);
    });

    it('returns false when coordinates are outside radius', () => {
      const outsideLat = 21.031511; // ~333m away
      const outsideLon = 105.804817;
      expect(isInsideGeofence(outsideLat, outsideLon, companyLat, companyLon, 150)).toBe(false);
    });

    it('returns false for non-positive radius', () => {
      expect(isInsideGeofence(companyLat, companyLon, companyLat, companyLon, 0)).toBe(false);
      expect(isInsideGeofence(companyLat, companyLon, companyLat, companyLon, -50)).toBe(false);
    });
  });

  describe('isValidGpsAccuracy', () => {
    it('accepts valid accuracy within tolerance', () => {
      expect(isValidGpsAccuracy(15, 50)).toBe(true);
      expect(isValidGpsAccuracy(50, 50)).toBe(true);
    });

    it('rejects accuracy exceeding threshold', () => {
      expect(isValidGpsAccuracy(51, 50)).toBe(false);
      expect(isValidGpsAccuracy(150, 50)).toBe(false);
    });

    it('rejects invalid or non-positive accuracy', () => {
      expect(isValidGpsAccuracy(0, 50)).toBe(false);
      expect(isValidGpsAccuracy(-10, 50)).toBe(false);
      expect(isValidGpsAccuracy(undefined, 50)).toBe(false);
      expect(isValidGpsAccuracy(null, 50)).toBe(false);
      expect(isValidGpsAccuracy(NaN, 50)).toBe(false);
    });
  });

  describe('isMockLocation', () => {
    it('detects mocked GPS flag', () => {
      expect(isMockLocation({ mocked: true })).toBe(true);
      expect(isMockLocation({ isFromMockProvider: true })).toBe(true);
      expect(isMockLocation({ mocked: false })).toBe(false);
      expect(isMockLocation(null)).toBe(false);
    });
  });

  describe('determineGeofenceTransition', () => {
    it('identifies ENTER when previously outside and now inside', () => {
      expect(determineGeofenceTransition(false, true)).toBe('ENTER');
    });

    it('identifies EXIT when previously inside and now outside', () => {
      expect(determineGeofenceTransition(true, false)).toBe('EXIT');
    });

    it('returns null when state does not change', () => {
      expect(determineGeofenceTransition(true, true)).toBeNull();
      expect(determineGeofenceTransition(false, false)).toBeNull();
      expect(determineGeofenceTransition(null, true)).toBeNull();
    });
  });
});

describe('Geofence Shift & Transition Business Logic', () => {
  const config: CompanyLocationConfig = {
    latitude: 21.028511,
    longitude: 105.804817,
    radius: 150,
    enabled: true,
  };

  it('rejects evaluation when geofence is disabled', () => {
    const disabledCfg = { ...config, enabled: false };
    const res = evaluateGeofenceEvent({
      coords: { latitude: 21.028511, longitude: 105.804817, accuracy: 10 },
      config: disabledCfg,
      wasInside: false,
    });
    expect(res.event).toBeNull();
    expect(res.rejectionReason).toBe('GEOFENCE_DISABLED');
  });

  it('rejects evaluation when GPS is inaccurate', () => {
    const res = evaluateGeofenceEvent({
      coords: { latitude: 21.028511, longitude: 105.804817, accuracy: 80 },
      config,
      wasInside: false,
    });
    expect(res.event).toBeNull();
    expect(res.rejectionReason).toBe('INACCURATE_GPS');
  });

  it('rejects evaluation when mock location is detected', () => {
    const res = evaluateGeofenceEvent({
      coords: { latitude: 21.028511, longitude: 105.804817, accuracy: 10, mocked: true },
      config,
      wasInside: false,
    });
    expect(res.event).toBeNull();
    expect(res.rejectionReason).toBe('MOCK_LOCATION_DETECTED');
  });

  it('creates CHECK_IN event on ENTER transition', () => {
    const testDate = new Date('2026-10-05T08:00:00.000Z');
    const res = evaluateGeofenceEvent({
      coords: { latitude: 21.028511, longitude: 105.804817, accuracy: 15 },
      config,
      wasInside: false,
      now: testDate,
    });

    expect(res.transition).toBe('ENTER');
    expect(res.event).not.toBeNull();
    expect(res.event?.type).toBe('CHECK_IN');
    expect(res.event?.source).toBe('GEOFENCE');
    expect(res.event?.status).toBe('PENDING');
    expect(res.event?.distanceFromCompany).toBeLessThanOrEqual(config.radius);
  });

  it('prevents CHECK_IN if today already has an open shift', () => {
    const todayRecord: any = {
      date: '2026-10-05',
      shift: { start: '08:00' }, // open shift
    };
    expect(canCreateCheckIn(todayRecord)).toBe(false);

    const res = evaluateGeofenceEvent({
      coords: { latitude: 21.028511, longitude: 105.804817, accuracy: 15 },
      config,
      wasInside: false,
      todayRecord,
    });

    expect(res.event).toBeNull();
    expect(res.rejectionReason).toBe('ALREADY_CLOCKED_IN');
  });

  it('allows CHECK_IN if today shift was completed (both start and end present)', () => {
    const todayRecord: any = {
      date: '2026-10-05',
      shift: { start: '08:00', end: '12:00' },
    };
    expect(canCreateCheckIn(todayRecord)).toBe(true);
  });

  it('creates CHECK_OUT event on EXIT transition when an open shift exists', () => {
    const testDate = new Date('2026-10-05T17:00:00.000Z');
    const todayRecord: any = {
      date: '2026-10-05',
      shift: { start: '08:00' }, // open shift
    };

    // User is now 400m away
    const outsideLat = 21.032511;
    const res = evaluateGeofenceEvent({
      coords: { latitude: outsideLat, longitude: 105.804817, accuracy: 15 },
      config,
      wasInside: true,
      todayRecord,
      now: testDate,
    });

    expect(res.transition).toBe('EXIT');
    expect(res.event).not.toBeNull();
    expect(res.event?.type).toBe('CHECK_OUT');
    expect(res.event?.status).toBe('PENDING');
    expect(res.event?.shiftDate).toBe('2026-10-05');
  });

  it('prevents CHECK_OUT if no shift is currently open', () => {
    const outsideLat = 21.032511;
    const res = evaluateGeofenceEvent({
      coords: { latitude: outsideLat, longitude: 105.804817, accuracy: 15 },
      config,
      wasInside: true,
      todayRecord: null,
      yesterdayRecord: null,
    });

    expect(res.event).toBeNull();
    expect(res.rejectionReason).toBe('NO_OPEN_SHIFT');
  });

  it('handles overnight shift correctly on CHECK_OUT', () => {
    const yesterdayRecord: any = {
      date: '2026-10-04',
      shift: { start: '20:00' }, // started night before
    };
    const todayRecord: any = {
      date: '2026-10-05',
      shift: null,
    };

    const checkoutCheck = canCreateCheckOut(todayRecord, yesterdayRecord);
    expect(checkoutCheck.allowed).toBe(true);
    expect(checkoutCheck.targetDate).toBe('2026-10-04');

    const testDate = new Date('2026-10-05T05:00:00.000Z');
    const outsideLat = 21.032511;
    const res = evaluateGeofenceEvent({
      coords: { latitude: outsideLat, longitude: 105.804817, accuracy: 15 },
      config,
      wasInside: true,
      todayRecord,
      yesterdayRecord,
      now: testDate,
    });

    expect(res.event).not.toBeNull();
    expect(res.event?.type).toBe('CHECK_OUT');
    expect(res.event?.shiftDate).toBe('2026-10-04');
  });

  it('enforces cooldown debounce period to prevent bouncing', () => {
    const now = new Date('2026-10-05T08:02:00.000Z');
    const lastEventTime = new Date('2026-10-05T08:00:00.000Z').getTime(); // 2 minutes ago

    const res = evaluateGeofenceEvent({
      coords: { latitude: 21.028511, longitude: 105.804817, accuracy: 15 },
      config,
      wasInside: false,
      lastEventTime,
      now,
      cooldownMs: 5 * 60 * 1000,
    });

    expect(res.event).toBeNull();
    expect(res.rejectionReason).toBe('COOLDOWN_ACTIVE');
  });
});

describe('Geofence Persistence & Sanitization', () => {
  it('saves and loads company location config correctly', async () => {
    const customConfig: CompanyLocationConfig = {
      latitude: 21.0285,
      longitude: 105.8048,
      radius: 250,
      enabled: true,
    };
    await saveCompanyLocation(customConfig);
    const loaded = await loadCompanyLocation();
    expect(loaded).not.toBeNull();
    expect(loaded?.latitude).toBe(21.0285);
    expect(loaded?.radius).toBe(250);
    expect(loaded?.enabled).toBe(true);
  });

  it('clamps radius to between 100m and 500m during sanitization', () => {
    const smallRadius = sanitizeCompanyLocationConfig({ ...DEFAULT_COMPANY_LOCATION, radius: 40 });
    expect(smallRadius.radius).toBe(100);

    const largeRadius = sanitizeCompanyLocationConfig({ ...DEFAULT_COMPANY_LOCATION, radius: 900 });
    expect(largeRadius.radius).toBe(500);
  });

  it('saves and loads pending attendance events', async () => {
    const event: PendingAttendanceEvent = {
      id: 'test_evt_1',
      type: 'CHECK_IN',
      detectedAt: '2026-10-05T08:00:00.000Z',
      latitude: 21.028511,
      longitude: 105.804817,
      accuracy: 12.5,
      distanceFromCompany: 25.3,
      source: 'GEOFENCE',
      status: 'PENDING',
      shiftDate: '2026-10-05',
      timeString: '08:00',
    };

    await savePendingEvents([event]);
    const loaded = await loadPendingEvents();
    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe('test_evt_1');
    expect(loaded[0].type).toBe('CHECK_IN');
    expect(loaded[0].distanceFromCompany).toBe(25.3);
  });

  it('sanitizes corrupt or invalid pending events', () => {
    expect(sanitizePendingAttendanceEvent(null)).toBeNull();
    expect(sanitizePendingAttendanceEvent({ id: '' })).toBeNull();
    expect(sanitizePendingAttendanceEvent({ id: '1', type: 'INVALID' })).toBeNull();
  });
});

describe('Geofence Store & Attendance Confirmation Workflow', () => {
  beforeEach(async () => {
    await savePendingEvents([]);
    await useAttendanceStore.getState().selectMonth('2026-10');
    // Clear October attendance items
    const current = useAttendanceStore.getState().items;
    for (const item of current) {
      await useAttendanceStore.getState().remove(item.date);
    }
  });

  it('confirms a CHECK_IN event, updating attendance with GEOFENCE_CONFIRMED source', async () => {
    const event: PendingAttendanceEvent = {
      id: 'evt_confirm_1',
      type: 'CHECK_IN',
      detectedAt: '2026-10-05T08:15:00.000Z',
      latitude: 21.028511,
      longitude: 105.804817,
      accuracy: 10,
      distanceFromCompany: 30,
      source: 'GEOFENCE',
      status: 'PENDING',
      shiftDate: '2026-10-05',
      timeString: '08:15',
    };

    await savePendingEvents([event]);
    await useGeofenceStore.getState().initGeofence();

    // Confirm the event
    await useGeofenceStore.getState().confirmEvent('evt_confirm_1');

    // Verify pending event is marked CONFIRMED
    const updatedEvents = useGeofenceStore.getState().pendingEvents;
    const confirmedEvt = updatedEvents.find((e) => e.id === 'evt_confirm_1');
    expect(confirmedEvt?.status).toBe('CONFIRMED');

    // Verify attendance record was created with GEOFENCE_CONFIRMED
    const attItems = useAttendanceStore.getState().items;
    const todayRec = attItems.find((r) => r.date === '2026-10-05');
    expect(todayRec).toBeDefined();
    expect(todayRec?.timeSource).toBe('GEOFENCE_CONFIRMED');
    expect(todayRec?.gpsMetadata?.distance).toBe(30);
    expect(todayRec?.gpsMetadata?.accuracy).toBe(10);
  });

  it('dismisses an event WITHOUT modifying or creating any attendance record', async () => {
    const event: PendingAttendanceEvent = {
      id: 'evt_dismiss_1',
      type: 'CHECK_IN',
      detectedAt: '2026-10-06T08:30:00.000Z',
      latitude: 21.028511,
      longitude: 105.804817,
      accuracy: 10,
      distanceFromCompany: 20,
      source: 'GEOFENCE',
      status: 'PENDING',
      shiftDate: '2026-10-06',
      timeString: '08:30',
    };

    await savePendingEvents([event]);
    await useGeofenceStore.getState().initGeofence();

    // Dismiss the event
    await useGeofenceStore.getState().dismissEvent('evt_dismiss_1');

    // Verify pending event is marked DISMISSED
    const updatedEvents = useGeofenceStore.getState().pendingEvents;
    const dismissedEvt = updatedEvents.find((e) => e.id === 'evt_dismiss_1');
    expect(dismissedEvt?.status).toBe('DISMISSED');

    // Verify ABSOLUTELY NO attendance record for 2026-10-06 was created
    const attItems = useAttendanceStore.getState().items;
    const dismissedRec = attItems.find((r) => r.date === '2026-10-06');
    expect(dismissedRec).toBeUndefined();
  });
});
