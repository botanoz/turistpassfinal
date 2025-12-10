import { useState } from 'react';
import { getDeviceFingerprint, getLocationInfo } from '@/lib/utils/deviceFingerprint';
import { toast } from 'sonner';

/**
 * Hook for tracking user devices
 * Automatically registers device on login and handles device limit notifications
 */
export function useDeviceTracking() {
  const [isTracking, setIsTracking] = useState(false);

  /**
   * Tracks the current device by registering it with the backend
   * Shows notifications if device limit is exceeded
   */
  const trackDevice = async () => {
    if (isTracking) {
      console.log('Device tracking already in progress');
      return;
    }

    try {
      setIsTracking(true);

      // Get device fingerprint and location info in parallel
      const [deviceInfo, locationInfo] = await Promise.all([
        getDeviceFingerprint(),
        getLocationInfo()
      ]);

      // Send to backend
      const response = await fetch('/api/auth/track-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceFingerprint: deviceInfo.fingerprint,
          deviceType: deviceInfo.deviceType,
          osName: deviceInfo.osName,
          osVersion: deviceInfo.osVersion,
          browserName: deviceInfo.browserName,
          browserVersion: deviceInfo.browserVersion,
          ipAddress: locationInfo.ipAddress,
          country: locationInfo.country,
          city: locationInfo.city,
          userAgent: deviceInfo.userAgent
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to track device');
      }

      // If other devices were logged out, notify user
      if (result.shouldLogoutOthers) {
        toast.warning('Device Limit Exceeded', {
          description: 'Your oldest device has been automatically logged out.',
          duration: 5000
        });
      }

    } catch (error: any) {
      console.error('Device tracking error:', error);
      // Don't show error toast to user - this is a background operation
      // The user can still proceed with login even if tracking fails
    } finally {
      setIsTracking(false);
    }
  };

  return { trackDevice, isTracking };
}
