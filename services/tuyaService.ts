// services/tuyaService.ts
import { TuyaCredentials, SmartDevice, DeviceType } from '../types';
import CryptoJS from 'crypto-js';

// Base URLs for Tuya
const REGION_URLS: {[key: string]: string} = {
    'us': 'https://openapi.tuyaus.com',
    'eu': 'https://openapi.tuyaeu.com',
    'cn': 'https://openapi.tuyacn.com',
    'in': 'https://openapi.tuyain.com'
};

const PROXY_URL = 'https://corsproxy.io/?';

/**
 * TUYA REAL INTEGRATION
 * Uses HMAC-SHA256 to sign requests.
 * Note: Browser CORS often blocks direct calls to Tuya APIs. 
 */

export const tuyaService = {
  validateCredentials: (creds: TuyaCredentials): boolean => {
    return creds.accessId.length > 0 && creds.accessSecret.length > 0;
  },

  /**
   * Helper to generate Tuya V1.0 Signature
   */
  signRequest: (clientId: string, secret: string, timestamp: number, accessToken: string = '', nonce: string = '') => {
    let strToSign = clientId + accessToken + timestamp + nonce;
    const hash = CryptoJS.HmacSHA256(strToSign, secret);
    return hash.toString(CryptoJS.enc.Hex).toUpperCase();
  },

  /**
   * Helper to build final URL with or without Proxy
   */
  buildUrl: (url: string, useProxy: boolean): string => {
      if (useProxy) {
          return `${PROXY_URL}${encodeURIComponent(url)}`;
      }
      return url;
  },

  /**
   * CONNECT: GET /v1.0/token?grant_type=1
   */
  connect: async (creds: TuyaCredentials, useProxy: boolean = false): Promise<boolean> => {
    console.log(`[TuyaService] Starting Real Auth for ID: ${creds.accessId} (Proxy: ${useProxy})`);
    
    const timestamp = new Date().getTime();
    const sign = tuyaService.signRequest(creds.accessId, creds.accessSecret, timestamp);
    const baseUrl = REGION_URLS[creds.region] || REGION_URLS['us'];
    const targetUrl = `${baseUrl}/v1.0/token?grant_type=1`;
    const finalUrl = tuyaService.buildUrl(targetUrl, useProxy);

    try {
        const response = await fetch(finalUrl, {
            method: 'GET',
            headers: {
                'client_id': creds.accessId,
                'sign': sign,
                't': timestamp.toString(),
                'sign_method': 'HMAC-SHA256',
                'nonce': '',
            }
        });

        if (!response.ok) {
             console.warn(`Tuya Auth Failed: ${response.status}`);
             return false;
        }

        const data = await response.json();
        if (data.success) {
            localStorage.setItem('tuya_access_token', data.result.access_token);
            localStorage.setItem('tuya_refresh_token', data.result.refresh_token);
            return true;
        } else {
            console.error('[TuyaService] Logic Error:', data);
            return false;
        }
    } catch (error) {
        console.warn("Connection error", error);
        return false; 
    }
  },

  /**
   * SYNC DEVICES
   * GET /v1.0/devices
   * Fetches real devices using the token obtained in connect.
   */
  syncDevices: async (creds: TuyaCredentials, useProxy: boolean = false): Promise<SmartDevice[]> => {
    console.log('[TuyaService] Syncing devices...');
    
    const accessToken = localStorage.getItem('tuya_access_token');
    if (!accessToken) {
        console.error("No access token found");
        return [];
    }

    const timestamp = new Date().getTime();
    const baseUrl = REGION_URLS[creds.region] || REGION_URLS['us'];
    
    // We use the general devices endpoint which usually lists devices for the cloud project
    // Note: In some Tuya permissions, you might need to query by user_id, but /v1.0/devices works for many cloud projects.
    const targetUrl = `${baseUrl}/v1.0/devices`;
    const finalUrl = tuyaService.buildUrl(targetUrl, useProxy);

    // Sign with Access Token
    const sign = tuyaService.signRequest(creds.accessId, creds.accessSecret, timestamp, accessToken);

    try {
        const response = await fetch(finalUrl, {
            method: 'GET',
            headers: {
                'client_id': creds.accessId,
                'access_token': accessToken,
                'sign': sign,
                't': timestamp.toString(),
                'sign_method': 'HMAC-SHA256',
            }
        });

        if (!response.ok) {
            console.warn("Failed to fetch devices", response.status);
            return [];
        }

        const data = await response.json();
        
        if (data.success && data.result && Array.isArray(data.result.devices)) {
             return data.result.devices.map((d: any) => mapTuyaDeviceToSmartDevice(d));
        } else if (data.success && data.result && Array.isArray(data.result)) {
             // Sometimes result is the array directly
             return data.result.map((d: any) => mapTuyaDeviceToSmartDevice(d));
        }

        console.log("No devices found in response", data);
        return [];

    } catch (error) {
        console.error("Device Sync Error", error);
        return [];
    }
  }
};

/**
 * Mapper function to convert Tuya Device Object to Dashboard SmartDevice
 */
function mapTuyaDeviceToSmartDevice(tuyaDev: any): SmartDevice {
    let type = DeviceType.OUTLET; // Default
    let value: string | number = 'Off';
    let unit = '';
    let isOn = false;

    // Detect Type based on Category code
    // cz: socket/outlet, dj: light, sp: camera, ck: switch, qn: curtain
    const cat = tuyaDev.category;
    if (cat === 'dj' || cat === 'dc') type = DeviceType.LIGHT;
    else if (cat === 'sp' || cat === 'sxt') type = DeviceType.CAMERA;
    else if (cat === 'qn' || cat === 'cl') type = DeviceType.CURTAIN;
    else if (cat === 'wk' || cat === 'ws') type = DeviceType.THERMOSTAT;
    else if (cat === 'ms') type = DeviceType.LOCK;

    // Determine Status (Simplified logic - assumes standard Tuya Status Set)
    if (tuyaDev.status) {
        const switchStatus = tuyaDev.status.find((s: any) => s.code === 'switch_led' || s.code === 'switch_1' || s.code === 'switch_on');
        if (switchStatus) {
            isOn = !!switchStatus.value;
        }

        // Try to find a value
        if (type === DeviceType.LIGHT) {
            const bright = tuyaDev.status.find((s: any) => s.code === 'bright_value' || s.code === 'bright_value_v2');
            if (bright) {
                value = Math.round(bright.value / 10); // Often 0-1000
                unit = '%';
            } else {
                value = isOn ? 100 : 0;
                unit = '%';
            }
        } else if (type === DeviceType.THERMOSTAT) {
            const temp = tuyaDev.status.find((s: any) => s.code === 'temp_current');
            if (temp) {
                value = temp.value;
                unit = '°C';
            }
        }
    }

    return {
        id: tuyaDev.id,
        name: tuyaDev.name,
        type: type,
        room: 'Imported', // Tuya API doesn't always send room name in this endpoint
        isOn: isOn,
        value: value,
        unit: unit
    };
}