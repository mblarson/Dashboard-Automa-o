import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  Zap, 
  Home, 
  User, 
  Menu, 
  Bell,
  Search,
  Thermometer,
  WifiOff
} from 'lucide-react';
import DeviceCard from './components/DeviceCard';
import EnergyChart from './components/EnergyChart';
import VoiceAssistant from './components/VoiceAssistant';
import ConnectHubModal from './components/ConnectHubModal';
import SettingsView from './components/SettingsView';
import { MOCK_ENERGY_DATA } from './constants';
import { SmartDevice, UpdateDevicePayload } from './types';
import { firebaseService, listenToLocalStorage } from './services/firebase';
import clsx from 'clsx';

function App() {
  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Hub Connection State
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Load Data from Firebase (or LocalStorage fallback)
  useEffect(() => {
    const unsubscribeFirebase = firebaseService.subscribeToDevices((updatedDevices) => {
      setDevices(updatedDevices);
      setLoading(false);
    });

    const unsubscribeLocal = listenToLocalStorage((updatedDevices) => {
       setDevices(updatedDevices);
    });

    return () => {
      unsubscribeFirebase();
      unsubscribeLocal();
    };
  }, []);

  const updateDevice = (payload: UpdateDevicePayload) => {
    setDevices(prevDevices => prevDevices.map(d => {
      if (d.id === payload.id) {
        return {
          ...d,
          isOn: payload.isOn !== undefined ? payload.isOn : d.isOn,
          value: payload.value !== undefined ? payload.value : d.value
        };
      }
      return d;
    }));

    firebaseService.updateDevice(payload.id, {
        ...(payload.isOn !== undefined && { isOn: payload.isOn }),
        ...(payload.value !== undefined && { value: payload.value })
    });
  };

  const handleToggle = (id: string, currentStatus: boolean) => {
    updateDevice({ id, isOn: !currentStatus });
  };

  const handleHubConnect = (provider: string, importedDevices: SmartDevice[]) => {
    setActiveProvider(provider);
    firebaseService.saveDevices(importedDevices);
  };

  const totalActive = devices.filter(d => d.isOn).length;
  const avgTemp = devices.find(d => d.type === 'THERMOSTAT')?.value || 21;

  // Render Content based on Active Tab
  const renderContent = () => {
    if (activeTab === 'settings') {
      return <SettingsView />;
    }

    // Default Dashboard Content
    return (
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Good Evening, Alex</h1>
          <p className="text-slate-400">Here's what's happening in your home today.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-700/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Active Devices</p>
                <p className="text-2xl font-bold text-slate-100">{totalActive} <span className="text-sm font-normal text-slate-500">/ {devices.length}</span></p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-700/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-xl">
                <Thermometer className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Avg Temp</p>
                <p className="text-2xl font-bold text-slate-100">{avgTemp}°C</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-700/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
            <h3 className="text-slate-200 font-semibold mb-4 z-10 relative">Energy Usage (24h)</h3>
            <div className="h-20 z-10 relative">
              <EnergyChart data={MOCK_ENERGY_DATA} />
            </div>
          </div>
        </div>

        {/* Scenes */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-slate-200">Scenes</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {['Morning', 'Away', 'Movie Night', 'Bedtime'].map((scene) => (
              <button 
                key={scene}
                className="flex-shrink-0 px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition-all whitespace-nowrap"
              >
                {scene}
              </button>
            ))}
          </div>
        </div>

        {/* Devices Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-200">Favorites</h2>
            <button className="text-sm text-cyan-400 hover:text-cyan-300">View All</button>
          </div>
          
          {loading ? (
            <div className="flex justify-center p-12 text-slate-500">Loading Devices...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {devices.map((device) => (
                <DeviceCard 
                    key={device.id} 
                    device={device} 
                    onToggle={handleToggle} 
                />
                ))}
                {devices.length === 0 && (
                    <div className="col-span-full p-8 text-center bg-slate-900/50 rounded-2xl border border-dashed border-slate-700 text-slate-400">
                        No devices found. Connect a Hub (Settings or Top Bar) to start.
                    </div>
                )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex overflow-hidden">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 border-r border-slate-800">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Zap className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            OmniHome
          </span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'rooms', icon: Home, label: 'Rooms' },
            { id: 'automation', icon: Zap, label: 'Automations' },
            { id: 'settings', icon: Settings, label: 'Settings' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                activeTab === item.id 
                  ? "bg-cyan-500/10 text-cyan-400" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Alex Doe</p>
              <p className="text-xs text-slate-500">Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header */}
        <header className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4 md:hidden">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 -ml-2 text-slate-400">
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-bold text-lg">OmniHome</span>
          </div>

          <div className="hidden md:flex items-center bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700 w-96">
            <Search className="w-4 h-4 text-slate-500 mr-2" />
            <input 
              type="text" 
              placeholder="Search devices, rooms, or scenes..." 
              className="bg-transparent border-none outline-none text-sm w-full placeholder-slate-500"
            />
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => !activeProvider && setShowConnectModal(true)}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300",
                activeProvider 
                  ? "bg-slate-800 border-green-900/50 cursor-default" 
                  : "bg-red-500/10 border-red-900/50 hover:bg-red-500/20 cursor-pointer"
              )}
            >
              <div className={clsx("w-2 h-2 rounded-full", activeProvider ? 'bg-green-500' : 'bg-red-500 animate-pulse')} />
              <span className={clsx("text-xs font-medium", activeProvider ? "text-slate-400" : "text-red-400")}>
                {activeProvider ? `${activeProvider} Hub Active` : 'Hub Disconnected'}
              </span>
              {!activeProvider && <WifiOff className="w-3 h-3 text-red-400 ml-1" />}
            </button>

            <button className="relative p-2 text-slate-400 hover:text-slate-200 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-slate-900" />
            </button>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {renderContent()}
        </div>
        
        {/* Voice Assistant Overlay */}
        <VoiceAssistant devices={devices} onUpdateDevice={updateDevice} />

        {/* Integration Modal */}
        <ConnectHubModal 
          isOpen={showConnectModal} 
          onClose={() => setShowConnectModal(false)}
          onConnect={handleHubConnect}
        />

      </main>
    </div>
  );
}

export default App;