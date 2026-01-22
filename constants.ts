import { SmartDevice, DeviceType, EnergyData } from './types';

export const INITIAL_DEVICES: SmartDevice[] = [
  { id: 'dev_1', name: 'Living Room Lights', type: DeviceType.LIGHT, room: 'Living Room', isOn: true, value: 80, unit: '%' },
  { id: 'dev_2', name: 'Kitchen Spots', type: DeviceType.LIGHT, room: 'Kitchen', isOn: false, value: 0, unit: '%' },
  { id: 'dev_3', name: 'Main Thermostat', type: DeviceType.THERMOSTAT, room: 'Hallway', isOn: true, value: 22, unit: '°C' },
  { id: 'dev_4', name: 'Front Door', type: DeviceType.LOCK, room: 'Entrance', isOn: true, value: 'Locked' }, // isOn=true means Locked
  { id: 'dev_5', name: 'Bedroom Ambient', type: DeviceType.LIGHT, room: 'Bedroom', isOn: false, value: 50, unit: '%' },
  { id: 'dev_6', name: 'Security Cam 1', type: DeviceType.CAMERA, room: 'Garage', isOn: true, value: 'Recording' },
];

export const MOCK_ENERGY_DATA: EnergyData[] = [
  { time: '00:00', usage: 0.4 },
  { time: '04:00', usage: 0.3 },
  { time: '08:00', usage: 1.2 },
  { time: '12:00', usage: 0.9 },
  { time: '16:00', usage: 1.5 },
  { time: '20:00', usage: 2.1 },
  { time: '23:59', usage: 0.8 },
];