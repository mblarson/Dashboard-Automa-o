import React from 'react';
import { Lightbulb, Thermometer, Lock, Unlock, Video, Power, Speaker, Plug, Blinds } from 'lucide-react';
import { SmartDevice, DeviceType } from '../types';
import clsx from 'clsx';

interface DeviceCardProps {
  device: SmartDevice;
  onToggle: (id: string, currentStatus: boolean) => void;
}

const DeviceCard: React.FC<DeviceCardProps> = ({ device, onToggle }) => {
  const getIcon = () => {
    switch (device.type) {
      case DeviceType.LIGHT:
        return <Lightbulb className={clsx("w-6 h-6", device.isOn ? "text-yellow-400 fill-yellow-400" : "text-slate-400")} />;
      case DeviceType.THERMOSTAT:
        return <Thermometer className={clsx("w-6 h-6", device.isOn ? "text-orange-500" : "text-slate-400")} />;
      case DeviceType.LOCK:
        return device.isOn ? <Lock className="w-6 h-6 text-red-400" /> : <Unlock className="w-6 h-6 text-green-400" />;
      case DeviceType.CAMERA:
        return <Video className={clsx("w-6 h-6", device.isOn ? "text-blue-400" : "text-slate-400")} />;
      case DeviceType.SPEAKER:
        return <Speaker className={clsx("w-6 h-6", device.isOn ? "text-purple-400" : "text-slate-400")} />;
      case DeviceType.OUTLET:
        return <Plug className={clsx("w-6 h-6", device.isOn ? "text-green-400" : "text-slate-400")} />;
      case DeviceType.CURTAIN:
        return <Blinds className={clsx("w-6 h-6", device.isOn ? "text-cyan-400" : "text-slate-400")} />;
      default:
        return <Power className="w-6 h-6 text-slate-400" />;
    }
  };

  const statusText = () => {
    if (device.type === DeviceType.THERMOSTAT) return `${device.value}${device.unit}`;
    if (device.type === DeviceType.LIGHT) return device.isOn ? `${device.value}%` : 'Off';
    if (device.type === DeviceType.LOCK) return device.isOn ? 'Locked' : 'Unlocked';
    if (device.type === DeviceType.OUTLET) return device.isOn ? 'On' : 'Off';
    if (device.type === DeviceType.CURTAIN) return `${device.value}% Open`;
    return device.isOn ? 'On' : 'Off';
  };

  return (
    <div 
      onClick={() => onToggle(device.id, device.isOn)}
      className={clsx(
        "relative overflow-hidden rounded-2xl p-4 transition-all duration-300 cursor-pointer group",
        "border border-slate-700/50 hover:border-cyan-500/50",
        device.isOn ? "bg-slate-800/80 shadow-lg shadow-cyan-900/20" : "bg-slate-900/50"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={clsx(
          "p-2 rounded-full transition-colors",
          device.isOn ? "bg-slate-700/50" : "bg-slate-800"
        )}>
          {getIcon()}
        </div>
        <div className={clsx(
          "w-8 h-4 rounded-full relative transition-colors duration-300",
          device.isOn ? "bg-cyan-500" : "bg-slate-600"
        )}>
          <div className={clsx(
            "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-300",
            device.isOn ? "left-4.5 translate-x-0" : "left-0.5"
          )} style={{ left: device.isOn ? 'calc(100% - 14px)' : '2px' }}/>
        </div>
      </div>
      
      <div>
        <h3 className="text-slate-100 font-medium text-sm sm:text-base truncate">{device.name}</h3>
        <p className="text-slate-400 text-xs mt-1">{device.room}</p>
        <div className="absolute bottom-4 right-4">
          <span className={clsx(
            "text-sm font-semibold",
            device.isOn ? "text-cyan-400" : "text-slate-500"
          )}>
            {statusText()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DeviceCard;