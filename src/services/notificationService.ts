import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { GeofenceEventType, PendingAttendanceEvent } from '../types/geofence';

export const GEOFENCE_CATEGORY = 'GEOFENCE_ATTENDANCE';
export const ACTION_CONFIRM = 'ACTION_CONFIRM';
export const ACTION_DISMISS = 'ACTION_DISMISS';

let isNotificationConfigured = false;

export async function initNotificationService(
  onAction?: (actionId: string, eventId: string) => void
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (!isNotificationConfigured) {
      await Notifications.setNotificationCategoryAsync(GEOFENCE_CATEGORY, [
        {
          identifier: ACTION_CONFIRM,
          buttonTitle: 'XÁC NHẬN',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: ACTION_DISMISS,
          buttonTitle: 'BỎ QUA',
          options: {
            isDestructive: true,
            opensAppToForeground: false,
          },
        },
      ]);

      if (onAction) {
        Notifications.addNotificationResponseReceivedListener((response) => {
          const actionIdentifier = response.actionIdentifier;
          const eventId = response.notification.request.content.data?.eventId as string;
          if (eventId && (actionIdentifier === ACTION_CONFIRM || actionIdentifier === ACTION_DISMISS)) {
            onAction(actionIdentifier, eventId);
          }
        });
      }

      isNotificationConfigured = true;
    }

    return true;
  } catch (error) {
    console.warn('Failed to configure notifications:', error);
    return false;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch {
    return false;
  }
}

export async function sendGeofenceNotification(event: PendingAttendanceEvent): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    const isCheckIn = event.type === 'CHECK_IN';
    const title = isCheckIn ? 'Đã đến công ty' : 'Bạn đã rời công ty';
    const body = isCheckIn
      ? `Đã đến vị trí lúc ${event.timeString}. Bấm để XÁC NHẬN chấm công vào.`
      : `Đã rời vị trí lúc ${event.timeString}. Bấm để XÁC NHẬN chấm công ra.`;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        categoryIdentifier: GEOFENCE_CATEGORY,
        data: {
          eventId: event.id,
          type: event.type,
          shiftDate: event.shiftDate,
        },
      },
      trigger: null, // show immediately
    });

    return id;
  } catch (error) {
    console.warn('Could not schedule geofence notification:', error);
    return null;
  }
}
