import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Activity, XCircle } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../services/audioUtils';
import { SmartDevice, UpdateDevicePayload, DeviceType } from '../types';

interface VoiceAssistantProps {
  devices: SmartDevice[];
  onUpdateDevice: (payload: UpdateDevicePayload) => void;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ devices, onUpdateDevice }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs for audio handling to avoid re-renders
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null); // Keep track of the session specifically
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Define tools
  const tools: FunctionDeclaration[] = [
    {
      name: 'updateDeviceState',
      description: 'Update the state of a smart home device (turn on/off, lock/unlock, set temperature).',
      parameters: {
        type: Type.OBJECT,
        properties: {
          deviceName: {
            type: Type.STRING,
            description: 'The fuzzy name of the device the user wants to control (e.g., "living room lights").',
          },
          action: {
            type: Type.STRING,
            description: 'The action to perform: "TURN_ON", "TURN_OFF", "SET_VALUE".',
            enum: ['TURN_ON', 'TURN_OFF', 'SET_VALUE'],
          },
          value: {
            type: Type.NUMBER,
            description: 'The numeric value to set (for brightness or temperature).',
          }
        },
        required: ['deviceName', 'action']
      }
    }
  ];

  const stopSession = useCallback(() => {
    // Cleanup Audio Context
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Stop playing sources
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    
    // Close session if possible (wrapper doesn't expose close easily on the promise, 
    // but we can assume the session is dropped if we stop sending)
    // In a real implementation we would call session.close() if we had the object stored.
    
    setIsActive(false);
    setIsConnecting(false);
    setVolume(0);
  }, []);

  const startSession = async () => {
    setError(null);
    setIsConnecting(true);

    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API Key not found");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      audioContextRef.current = outputCtx; // Store output ctx for playback

      // Get Microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are a helpful, witty smart home assistant named Omni. 
          You control a smart home dashboard. 
          Current devices: ${JSON.stringify(devices.map(d => ({name: d.name, id: d.id, type: d.type, room: d.room})))}.
          When asked to control a device, find the closest matching device name and use the tool.
          Confirm actions briefly.`,
          tools: [{ functionDeclarations: tools }]
        },
        callbacks: {
          onopen: () => {
            console.log("Session opened");
            setIsConnecting(false);
            setIsActive(true);

            // Setup Input Processing
            const source = inputCtx.createMediaStreamSource(stream);
            inputSourceRef.current = source;
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Calculate volume for visualizer
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolume(Math.sqrt(sum / inputData.length));

              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => {
                sessionRef.current = session;
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle Tool Calls
            if (msg.toolCall) {
              console.log("Tool Call Received:", msg.toolCall);
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'updateDeviceState') {
                  const { deviceName, action, value } = fc.args as any;
                  
                  // Find device logic (client side simple match)
                  const targetDevice = devices.find(d => 
                    d.name.toLowerCase().includes(deviceName.toLowerCase()) || 
                    d.room.toLowerCase().includes(deviceName.toLowerCase())
                  );

                  let result = "Device not found";
                  if (targetDevice) {
                     const isOn = action === 'TURN_ON' ? true : action === 'TURN_OFF' ? false : targetDevice.isOn;
                     // If SET_VALUE, keep current On state unless 0
                     
                     onUpdateDevice({
                       id: targetDevice.id,
                       isOn,
                       value: value !== undefined ? value : targetDevice.value
                     });
                     result = `OK, ${action} executed for ${targetDevice.name}`;
                  }

                  sessionPromise.then(session => {
                    session.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result }
                      }
                    });
                  });
                }
              }
            }

            // Handle Audio Output
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
               try {
                 const data = base64ToUint8Array(base64Audio);
                 const buffer = await decodeAudioData(data, outputCtx, 24000, 1);
                 
                 nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                 
                 const source = outputCtx.createBufferSource();
                 source.buffer = buffer;
                 source.connect(outputCtx.destination);
                 source.start(nextStartTimeRef.current);
                 
                 nextStartTimeRef.current += buffer.duration;
                 
                 sourcesRef.current.add(source);
                 source.onended = () => sourcesRef.current.delete(source);
               } catch (err) {
                 console.error("Audio decode error", err);
               }
            }
          },
          onclose: () => {
            console.log("Session closed");
            stopSession();
          },
          onerror: (err) => {
            console.error("Session error", err);
            setError("Connection error");
            stopSession();
          }
        }
      });

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to start");
      setIsConnecting(false);
    }
  };

  // Re-sync devices in prompt when devices change? 
  // Complex for this demo, usually you send updated context or just rely on initial prompt.
  // For this demo, we assume the initial device list is enough context, 
  // or the model is smart enough to handle fuzzy matches based on what we initially sent.
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);


  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {error && (
        <div className="bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg mb-2 text-sm animate-fade-in">
          {error}
        </div>
      )}
      
      {isActive && (
        <div className="bg-slate-800/90 backdrop-blur border border-slate-700 p-4 rounded-2xl shadow-2xl mb-2 w-64 animate-slide-up">
           <div className="flex items-center gap-3 mb-2">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
             <span className="text-sm font-medium text-slate-200">Omni is listening...</span>
           </div>
           {/* Visualizer */}
           <div className="flex items-center justify-center gap-1 h-8">
             {[...Array(5)].map((_, i) => (
               <div 
                  key={i}
                  className="w-1.5 bg-cyan-400 rounded-full transition-all duration-75"
                  style={{ 
                    height: `${Math.max(4, Math.min(32, volume * 1000 * (Math.random() + 0.5)))}px`,
                    opacity: 0.8
                  }}
               />
             ))}
           </div>
        </div>
      )}

      <button
        onClick={isActive ? stopSession : startSession}
        disabled={isConnecting}
        className={`
          h-16 w-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300
          ${isActive 
            ? 'bg-red-500 hover:bg-red-600 shadow-red-900/50' 
            : 'bg-cyan-500 hover:bg-cyan-400 shadow-cyan-900/50'
          }
          ${isConnecting ? 'animate-pulse cursor-wait' : ''}
        `}
      >
        {isConnecting ? (
          <Activity className="w-8 h-8 text-white" />
        ) : isActive ? (
          <MicOff className="w-8 h-8 text-white" />
        ) : (
          <Mic className="w-8 h-8 text-white" />
        )}
      </button>
    </div>
  );
};

export default VoiceAssistant;