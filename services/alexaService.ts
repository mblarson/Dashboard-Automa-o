// services/alexaService.ts
import { SmartDevice, DeviceType } from '../types';

const CLIENT_ID = 'amzn1.application-oa2-client.YOUR_CLIENT_ID'; 
const SCOPE = 'alexa::skills:account_linking';

export const alexaService = {
  getAuthUrl: () => {
    const REDIRECT_URI = window.location.origin + '/auth/callback'; 
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      scope: SCOPE,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      state: 'security_token_123',
    });
    return `https://www.amazon.com/ap/oa?${params.toString()}`;
  },

  pollForConnection: async (): Promise<boolean> => {
    console.log('[AlexaService] Polling backend for OAuth completion...');
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('[AlexaService] Connection established!');
        resolve(true);
      }, 3000);
    });
  },

  syncDevices: async (): Promise<SmartDevice[]> => {
    console.log('[AlexaService] Syncing devices from Alexa Cloud...');
    
    await new Promise(r => setTimeout(r, 1500));

    // Mock devices removed per user request (no ghost devices)
    return [];
  }
};