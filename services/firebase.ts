import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, onSnapshot, updateDoc, writeBatch, getDoc } from 'firebase/firestore';
import { SmartDevice } from '../types';
import { INITIAL_DEVICES } from '../constants';

// Configuração Real do Usuário
const defaultFirebaseConfig = {
  apiKey: "AIzaSyA8Q_cseB5UDSkNx8eJQnd_s3yFr3R3CAM",
  authDomain: "dashboardautomacao-965c3.firebaseapp.com",
  projectId: "dashboardautomacao-965c3",
  storageBucket: "dashboardautomacao-965c3.firebasestorage.app",
  messagingSenderId: "572155684048",
  appId: "1:572155684048:web:6bf3b1b69b904a0b552ad5"
};

// State to track if Firebase is actually active
let db: any = null;
let useLocalStorage = true;

const CONFIG_STORAGE_KEY = 'omnihome_firebase_config';
const DATA_STORAGE_KEY = 'omnihome_devices';

// Initialize Logic
const initService = () => {
    let activeConfig = defaultFirebaseConfig;
    
    // Try to load from LocalStorage override if exists
    const storedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (storedConfig) {
        try {
            const parsed = JSON.parse(storedConfig);
            // Only use stored config if it has a valid project ID, otherwise fallback to default
            if (parsed.projectId) {
                activeConfig = parsed;
            }
        } catch (e) {
            console.error("Failed to parse stored firebase config");
        }
    }

    try {
        // Check if we have valid config
        if (activeConfig.apiKey && activeConfig.apiKey !== "YOUR_API_KEY_HERE") {
            const app = initializeApp(activeConfig);
            db = getFirestore(app);
            useLocalStorage = false;
            console.log("[Firebase] Service initialized successfully with Project ID:", activeConfig.projectId);
        } else {
            console.warn("[Firebase] No valid config found. Using LocalStorage fallback mode.");
            useLocalStorage = true;
        }
    } catch (e) {
        console.error("[Firebase] Initialization failed:", e);
        useLocalStorage = true;
    }
};

// Run initialization
initService();

export const firebaseService = {
  /**
   * Verifica se o Firebase está conectado
   */
  isConnected: () => !useLocalStorage,

  /**
   * Salva as configurações do Firebase e recarrega a página
   */
  updateConfig: (config: any) => {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
      window.location.reload();
  },

  /**
   * Remove as configurações do Firebase
   */
  resetConfig: () => {
      localStorage.removeItem(CONFIG_STORAGE_KEY);
      window.location.reload();
  },

  /**
   * Salva credenciais de integração (ex: Tuya) no Firestore
   */
  saveIntegrationConfig: async (provider: string, credentials: any) => {
    if (useLocalStorage) return;
    try {
      const docRef = doc(db, 'settings', `integration_${provider.toLowerCase()}`);
      await setDoc(docRef, credentials);
      console.log(`[Firebase] Saved ${provider} credentials`);
    } catch (e) {
      console.error("Error saving integration config", e);
    }
  },

  /**
   * Recupera credenciais de integração salvas
   */
  getIntegrationConfig: async (provider: string) => {
    if (useLocalStorage) return null;
    try {
      const docRef = doc(db, 'settings', `integration_${provider.toLowerCase()}`);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (e) {
      console.error("Error fetching integration config", e);
      return null;
    }
  },

  /**
   * Escuta alterações nos dispositivos em tempo real
   */
  subscribeToDevices: (
      onData: (devices: SmartDevice[]) => void, 
      onError?: (error: string) => void
  ) => {
    if (useLocalStorage) {
        const stored = localStorage.getItem(DATA_STORAGE_KEY);
        // Se não tiver nada no local storage, retorna array vazio (não cria INITIAL_DEVICES)
        if (stored) {
            onData(JSON.parse(stored));
        } else {
            onData([]);
        }
        return () => {}; 
    }

    // Real Firestore Listener
    try {
        const devicesRef = collection(db, 'devices');
        const unsubscribe = onSnapshot(devicesRef, (snapshot) => {
            const devices: SmartDevice[] = [];
            snapshot.forEach((doc) => {
                devices.push(doc.data() as SmartDevice);
            });
            devices.sort((a, b) => a.name.localeCompare(b.name));
            
            // REMOVIDO: A lógica que inseria INITIAL_DEVICES se a lista estivesse vazia.
            // Agora respeitamos o estado real do banco.
            onData(devices);
            
        }, (error) => {
             console.error("Firestore Error:", error);
             
             if (error.code === 'permission-denied') {
                 if (onError) onError('PERMISSION_DENIED');
             } else {
                 if (onError) onError(error.message);
             }

             const stored = localStorage.getItem(DATA_STORAGE_KEY);
             if (stored) onData(JSON.parse(stored));
        });
        return unsubscribe;
    } catch (e: any) {
        console.error("Error setting up listener", e);
        if (onError) onError(e.message);
        return () => {};
    }
  },

  /**
   * Salva uma lista inteira de dispositivos
   */
  saveDevices: async (devices: SmartDevice[]) => {
    localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(devices));
    window.dispatchEvent(new CustomEvent('local-storage-update', { detail: devices }));

    if (useLocalStorage) return;

    // Batch write to Firestore
    try {
        const batch = writeBatch(db);
        devices.forEach(device => {
            const docRef = doc(db, 'devices', device.id);
            batch.set(docRef, device);
        });
        await batch.commit();
        console.log("[Firebase] Batch saved devices to Firestore");
    } catch (e: any) {
        console.error("Error saving to Firestore", e);
    }
  },

  /**
   * Atualiza o estado de um único dispositivo
   */
  updateDevice: async (deviceId: string, updates: Partial<SmartDevice>) => {
    const stored = localStorage.getItem(DATA_STORAGE_KEY);
    let devices = stored ? JSON.parse(stored) : [];
    devices = devices.map((d: SmartDevice) => d.id === deviceId ? { ...d, ...updates } : d);
    localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(devices));
    window.dispatchEvent(new CustomEvent('local-storage-update', { detail: devices }));

    if (useLocalStorage) return;

    try {
        const docRef = doc(db, 'devices', deviceId);
        await updateDoc(docRef, updates);
    } catch (e) {
        console.error("Error updating Firestore doc", e);
    }
  }
};

export const listenToLocalStorage = (callback: (devices: SmartDevice[]) => void) => {
    const handler = (e: CustomEvent) => callback(e.detail);
    window.addEventListener('local-storage-update', handler as any);
    return () => window.removeEventListener('local-storage-update', handler as any);
};