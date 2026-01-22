import React, { useState, useEffect } from 'react';
import { Save, Database, Trash2, CheckCircle, AlertTriangle, Cloud } from 'lucide-react';
import { firebaseService } from '../services/firebase';

const SettingsView: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  
  // Form State
  const [config, setConfig] = useState({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });

  useEffect(() => {
    setIsConnected(firebaseService.isConnected());
    
    // Load existing config if available (masking sensitive data strictly for UI if needed, but here we keep simple)
    const stored = localStorage.getItem('omnihome_firebase_config');
    if (stored) {
      setConfig(JSON.parse(stored));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    if (!config.apiKey || !config.projectId) {
      alert("Please fill in at least API Key and Project ID");
      return;
    }
    firebaseService.updateConfig(config);
  };

  const handleDisconnect = () => {
    if (confirm("Are you sure you want to disconnect Firebase? Your devices will stop syncing across browsers.")) {
      firebaseService.resetConfig();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-slate-400">Manage your cloud connections and dashboard preferences.</p>
      </div>

      {/* Connection Status */}
      <div className={`p-6 rounded-2xl border ${isConnected ? 'bg-green-500/10 border-green-500/50' : 'bg-slate-800 border-slate-700'}`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Firebase Backend Status: {isConnected ? <span className="text-green-400">Connected</span> : <span className="text-slate-400">Offline (Local Mode)</span>}
            </h3>
            <p className="text-sm text-slate-400">
              {isConnected 
                ? `Syncing data with project: ${config.projectId}`
                : "Using browser storage. Connect Firebase to sync across devices."
              }
            </p>
          </div>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
           <Cloud className="w-5 h-5 text-cyan-400" />
           <h2 className="text-xl font-semibold text-slate-200">Firebase Configuration</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">API Key</label>
            <input 
              name="apiKey"
              type="text"
              value={config.apiKey}
              onChange={handleChange}
              placeholder="AIzaSy..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-cyan-500 outline-none transition-colors"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Project ID</label>
            <input 
              name="projectId"
              type="text"
              value={config.projectId}
              onChange={handleChange}
              placeholder="omnihome-123"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-cyan-500 outline-none transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Auth Domain</label>
            <input 
              name="authDomain"
              type="text"
              value={config.authDomain}
              onChange={handleChange}
              placeholder="project.firebaseapp.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-cyan-500 outline-none transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Storage Bucket</label>
            <input 
              name="storageBucket"
              type="text"
              value={config.storageBucket}
              onChange={handleChange}
              placeholder="project.appspot.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-cyan-500 outline-none transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Messaging Sender ID</label>
            <input 
              name="messagingSenderId"
              type="text"
              value={config.messagingSenderId}
              onChange={handleChange}
              placeholder="123456789"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-cyan-500 outline-none transition-colors"
            />
          </div>

           <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">App ID</label>
            <input 
              name="appId"
              type="text"
              value={config.appId}
              onChange={handleChange}
              placeholder="1:123456:web:..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-cyan-500 outline-none transition-colors"
            />
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button 
            onClick={handleSave}
            className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-900/20"
          >
            <Save className="w-5 h-5" />
            {isConnected ? 'Update Configuration' : 'Save & Connect'}
          </button>
          
          {isConnected && (
            <button 
              onClick={handleDisconnect}
              className="px-6 border border-red-900/50 text-red-400 hover:bg-red-900/20 rounded-xl flex items-center justify-center transition-all"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Instructions */}
      <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
        <h4 className="flex items-center gap-2 font-medium text-slate-300 mb-3">
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          Where to find these values?
        </h4>
        <ol className="list-decimal list-inside text-sm text-slate-400 space-y-2 ml-2">
           <li>Go to the <a href="https://console.firebase.google.com" target="_blank" className="text-cyan-400 hover:underline">Firebase Console</a>.</li>
           <li>Select your project (or create one).</li>
           <li>Click the gear icon next to "Project Overview" and select <b>Project settings</b>.</li>
           <li>Scroll down to "Your apps". If you haven't created a Web App, click the <b>&lt;/&gt;</b> icon.</li>
           <li>Copy the values from the `firebaseConfig` object SDK snippet.</li>
        </ol>
      </div>

    </div>
  );
};

export default SettingsView;