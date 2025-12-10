import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { UAParser } from 'ua-parser-js';

export interface DeviceInfo {
  fingerprint: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  osName: string;
  osVersion: string;
  browserName: string;
  browserVersion: string;
  userAgent: string;
}

export interface LocationInfo {
  ipAddress: string;
  country: string;
  city: string;
}

/**
 * Generates a unique device fingerprint using browser characteristics
 * @returns Device information including fingerprint, type, OS, and browser details
 */
export async function getDeviceFingerprint(): Promise<DeviceInfo> {
  try {
    // Initialize FingerprintJS
    const fp = await FingerprintJS.load();
    const result = await fp.get();

    // Parse User Agent
    const parser = new UAParser();
    const ua = parser.getResult();

    // Determine device type
    let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (ua.device.type === 'mobile') {
      deviceType = 'mobile';
    } else if (ua.device.type === 'tablet') {
      deviceType = 'tablet';
    }

    return {
      fingerprint: result.visitorId,
      deviceType,
      osName: ua.os.name || 'Unknown',
      osVersion: ua.os.version || '',
      browserName: ua.browser.name || 'Unknown',
      browserVersion: ua.browser.version || '',
      userAgent: navigator.userAgent
    };
  } catch (error) {
    console.error('Failed to generate device fingerprint:', error);

    // Fallback to basic user agent parsing
    const parser = new UAParser();
    const ua = parser.getResult();

    return {
      fingerprint: `fallback-${Date.now()}-${Math.random()}`,
      deviceType: ua.device.type === 'mobile' ? 'mobile' :
                  ua.device.type === 'tablet' ? 'tablet' : 'desktop',
      osName: ua.os.name || 'Unknown',
      osVersion: ua.os.version || '',
      browserName: ua.browser.name || 'Unknown',
      browserVersion: ua.browser.version || '',
      userAgent: navigator.userAgent
    };
  }
}

/**
 * Gets user's geolocation information based on IP address
 * @returns Location information including IP, country, and city
 */
export async function getLocationInfo(): Promise<LocationInfo> {
  try {
    // Call IP geolocation API (ipapi.co provides free tier)
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch location');
    }

    const data = await response.json();

    return {
      ipAddress: data.ip || '',
      country: data.country_name || '',
      city: data.city || ''
    };
  } catch (error) {
    console.error('Failed to get location:', error);

    // Return empty values on error
    return {
      ipAddress: '',
      country: '',
      city: ''
    };
  }
}

/**
 * Gets complete device and location information
 * @returns Combined device and location information
 */
export async function getCompleteDeviceInfo() {
  const [deviceInfo, locationInfo] = await Promise.all([
    getDeviceFingerprint(),
    getLocationInfo()
  ]);

  return {
    ...deviceInfo,
    ...locationInfo
  };
}
