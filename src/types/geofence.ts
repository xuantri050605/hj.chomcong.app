export interface CompanyLocationConfig {
  latitude: number;
  longitude: number;
  radius: number; // in meters (100 - 500)
  enabled: boolean;
  updatedAt?: string;
}

export type GeofenceEventType = 'CHECK_IN' | 'CHECK_OUT';
export type PendingEventStatus = 'PENDING' | 'CONFIRMED' | 'DISMISSED';

export interface PendingAttendanceEvent {
  id: string;
  type: GeofenceEventType;
  detectedAt: string; // ISO string
  latitude: number;
  longitude: number;
  accuracy: number;
  distanceFromCompany: number;
  source: 'GEOFENCE';
  status: PendingEventStatus;
  shiftDate: string; // YYYY-MM-DD
  timeString: string; // HH:mm
}

export interface GeofenceStatus {
  isInside: boolean;
  currentDistance: number | null;
  currentCoords: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    mocked?: boolean;
  } | null;
  lastEventAt: string | null;
  lastEventType: GeofenceEventType | null;
  locationPermission: 'granted' | 'denied' | 'undetermined';
  backgroundPermission: 'granted' | 'denied' | 'undetermined';
  notificationPermission: 'granted' | 'denied' | 'undetermined';
  error: string | null;
}

export const DEFAULT_COMPANY_LOCATION: CompanyLocationConfig = {
  // Tọa độ Hojeong Vina mặc định (hoặc tọa độ mẫu tiêu chuẩn)
  latitude: 21.028511,
  longitude: 105.804817,
  radius: 150, // 150 mét
  enabled: false,
};
