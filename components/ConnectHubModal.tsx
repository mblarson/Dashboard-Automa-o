import React, { useState } from 'react';
import { X, Check, Loader2, Wifi, ShieldCheck, ExternalLink, Info, Copy, Terminal, QrCode, Smartphone, Key, Globe, Lock } from 'lucide-react';
import { alexaService } from '../services/alexaService';
import { tuyaService } from '../services/tuyaService';
import { TuyaCredentials } from '../types';
import clsx from 'clsx';

interface ConnectHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (provider: 'Alexa' | 'Tuya') => void;
}

const ConnectHubModal: React.FC<ConnectHubModalProps> = ({ isOpen, onClose, onConnect }) => {
  const [connecting, setConnecting] = useState(false);
  const [step, setStep] = useState<'select' | 'auth_alexa' | 'config_tuya' | 'sync' | 'success'>('select');
  const [showDevInfo, setShowDevInfo] = useState<'alexa' | 'tuya' | null>(null);
  
  // Tuya Form State
  const [tuyaCreds, setTuyaCreds] = useState<TuyaCredentials>({
    accessId: '',
    accessSecret: '',
    region: 'us'
  });

  if (!isOpen) return null;

  const handleConnectAlexa = async () => {
    setStep('auth_alexa');
    setConnecting(true);
    await alexaService.pollForConnection();
    setStep('sync');
    await alexaService.syncDevices();
    finishConnection('Alexa');
  };

  const handleConnectTuya = async () => {
    if (!tuyaService.validateCredentials(tuyaCreds)) return;

    setConnecting(true);
    try {
        await tuyaService.connect(tuyaCreds);
        setStep('sync');
        await tuyaService.syncDevices();
        finishConnection('Tuya');
    } catch (e) {
        setConnecting(false);
        // Handle error visually if needed
        alert("Invalid Credentials");
    }
  };

  const finishConnection = (provider: 'Alexa' | 'Tuya') => {
    setConnecting(false);
    setStep('success');
    
    setTimeout(() => {
      onConnect(provider);
      onClose();
      setTimeout(() => {
        setStep('select');
        setShowDevInfo(null);
        setTuyaCreds({ accessId: '', accessSecret: '', region: 'us' });
      }, 500); 
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 shrink-0">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Wifi className="w-5 h-5 text-cyan-400" />
            Connect Provider
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          {step === 'select' && !showDevInfo && (
            <div className="space-y-4 animate-slide-up">
              <p className="text-slate-400 text-sm mb-4">Select your smart home provider to import devices.</p>
              
              {/* Alexa Option */}
              <div className="relative group">
                 <button 
                  onClick={handleConnectAlexa}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-cyan-500/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#00CAFF]/20 rounded-lg flex items-center justify-center">
                      <span className="font-bold text-[#00CAFF] text-lg">A</span>
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-slate-200">Amazon Alexa</h3>
                      <p className="text-xs text-slate-500">Cloud-to-Cloud Integration</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full border border-slate-600 flex items-center justify-center group-hover:border-cyan-500 group-hover:bg-cyan-500/10">
                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />
                  </div>
                </button>
                <button onClick={(e) => { e.stopPropagation(); setShowDevInfo('alexa'); }} className="absolute right-14 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-cyan-400">
                   <Info className="w-4 h-4" />
                </button>
              </div>

              {/* Tuya Option */}
              <div className="relative group">
                <button 
                  onClick={() => setStep('config_tuya')}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-orange-500/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <span className="font-bold text-orange-500 text-lg">T</span>
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-slate-200">Tuya Smart</h3>
                      <p className="text-xs text-slate-500">IoT Core API</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full border border-slate-600 flex items-center justify-center group-hover:border-orange-500 group-hover:bg-orange-500/10">
                    <Key className="w-4 h-4 text-slate-400 group-hover:text-orange-400" />
                  </div>
                </button>
                 <button onClick={(e) => { e.stopPropagation(); setShowDevInfo('tuya'); }} className="absolute right-14 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-orange-400">
                   <Info className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 'select' && showDevInfo === 'alexa' && (
             <div className="space-y-4 animate-slide-up">
              <button onClick={() => setShowDevInfo(null)} className="text-xs text-slate-500 hover:text-white mb-2 flex items-center gap-1">← Back</button>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-white flex items-center gap-2"><Terminal className="w-4 h-4 text-cyan-400" /> Alexa Dev Config</h3>
                <div className="space-y-2 mt-4 text-xs">
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">Skill: <span className="text-green-400">Smart Home Skill API v3</span></div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">Auth: <span className="text-slate-300">Login with Amazon (LWA)</span></div>
                </div>
              </div>
            </div>
          )}

          {step === 'select' && showDevInfo === 'tuya' && (
             <div className="space-y-4 animate-slide-up">
              <button onClick={() => setShowDevInfo(null)} className="text-xs text-slate-500 hover:text-white mb-2 flex items-center gap-1">← Back</button>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-white flex items-center gap-2"><Terminal className="w-4 h-4 text-orange-400" /> Tuya IoT Config</h3>
                <p className="text-sm text-slate-400">To get these keys:</p>
                <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1 ml-1">
                  <li>Log in to <b>iot.tuya.com</b></li>
                  <li>Go to <b>Cloud</b> {'>'} <b>Development</b></li>
                  <li>Create or Open a Project</li>
                  <li>Copy <b>Access ID</b> and <b>Access Secret</b></li>
                </ol>
              </div>
            </div>
          )}

          {step === 'auth_alexa' && (
             <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in py-8">
               <div className="relative">
                 <div className="w-16 h-16 rounded-full border-4 border-slate-700 border-t-cyan-500 animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center"><span className="font-bold text-[#00CAFF]">A</span></div>
               </div>
               <div><h3 className="text-lg font-medium text-slate-200">Waiting for Amazon Login...</h3></div>
             </div>
          )}

          {step === 'config_tuya' && (
             <div className="space-y-5 animate-slide-up">
               <button onClick={() => setStep('select')} className="text-xs text-slate-500 hover:text-white mb-2 flex items-center gap-1">← Back</button>
               
               <div className="text-center mb-6">
                 <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <span className="font-bold text-orange-500 text-xl">T</span>
                 </div>
                 <h3 className="text-lg font-medium text-white">Tuya IoT Credentials</h3>
                 <p className="text-xs text-slate-500">Enter your project keys from iot.tuya.com</p>
               </div>

               <div className="space-y-4">
                 <div className="space-y-1">
                   <label className="text-xs text-slate-400 font-medium ml-1">Access ID (Client ID)</label>
                   <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <Key className="h-4 w-4 text-slate-500" />
                     </div>
                     <input 
                        type="text"
                        value={tuyaCreds.accessId}
                        onChange={(e) => setTuyaCreds({...tuyaCreds, accessId: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors"
                        placeholder="e.g. t583..."
                     />
                   </div>
                 </div>

                 <div className="space-y-1">
                   <label className="text-xs text-slate-400 font-medium ml-1">Access Secret (Client Secret)</label>
                   <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <Lock className="h-4 w-4 text-slate-500" />
                     </div>
                     <input 
                        type="password"
                        value={tuyaCreds.accessSecret}
                        onChange={(e) => setTuyaCreds({...tuyaCreds, accessSecret: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors"
                        placeholder="••••••••••••••••"
                     />
                   </div>
                 </div>

                 <div className="space-y-1">
                   <label className="text-xs text-slate-400 font-medium ml-1">Data Center Region</label>
                   <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <Globe className="h-4 w-4 text-slate-500" />
                     </div>
                     <select 
                        value={tuyaCreds.region}
                        onChange={(e) => setTuyaCreds({...tuyaCreds, region: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors appearance-none"
                     >
                       <option value="us">Western America (US)</option>
                       <option value="eu">Central Europe (EU)</option>
                       <option value="cn">China (CN)</option>
                       <option value="in">India (IN)</option>
                     </select>
                   </div>
                 </div>
               </div>

               <button 
                 onClick={handleConnectTuya}
                 disabled={connecting || !tuyaCreds.accessId || !tuyaCreds.accessSecret}
                 className="w-full mt-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2"
               >
                 {connecting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Authenticate'}
               </button>
             </div>
          )}

           {step === 'sync' && (
             <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in py-8">
               <div className="relative">
                 <div className="w-16 h-16 rounded-full border-4 border-slate-700 border-t-green-500 animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center"><Wifi className="w-6 h-6 text-green-500" /></div>
               </div>
               <div><h3 className="text-lg font-medium text-slate-200">Importing Devices...</h3></div>
             </div>
          )}

          {step === 'success' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-scale-up py-8">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-10 h-10 text-green-400" />
              </div>
               <div><h3 className="text-lg font-medium text-white">Integration Active</h3></div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ConnectHubModal;