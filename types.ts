export enum DeviceType {
  LIGHT = 'LIGHT',
  THERMOSTAT = 'THERMOSTAT',
  LOCK = 'LOCK',
  CAMERA = 'CAMERA',
  SPEAKER = 'SPEAKER'
}

export interface SmartDevice {
  id: string;
  name: string;
  type: DeviceType;
  room: string;
  isOn: boolean;
  value?: number | string; // For temperature, brightness, etc.
  unit?: string;
}

export interface Room {
  id: string;
  name: string;
  icon: string;
}

export interface EnergyData {
  time: string;
  usage: number; // kWh
}

export type UpdateDevicePayload = {
  id: string;
  isOn?: boolean;
  value?: number | string;
};

export interface TuyaCredentials {
  accessId: string;
  accessSecret: string;
  region: string;
}