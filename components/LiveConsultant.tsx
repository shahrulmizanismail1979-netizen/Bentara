import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Mic, MicOff, X, MessageSquare, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveConsultantProps {
  onClose: () => void;
  context: string;
}

const LiveConsultant: React.FC<LiveConsultantProps> = ({ onClose, context }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);

  const startSession = async () => {
    if (!process.env.API_KEY) return;
    
    setIsConnecting(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: `You are "Bentara", a royal digital consultant for the Malay Sultanate. 
          Your tone is highly professional, regal, and authoritative. 
          You assist with transcription, legal advice, and academic research. 
          Current context: ${context.toUpperCase()}.
          Speak in formal Bahasa Melayu (Bahasa Baku) by default, but you can switch to English if the user does.
          Always adhere to DBP standards.`,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            startAudioCapture();
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
              const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
              const audioData = base64ToUint8Array(base64Audio);
              const pcmData = new Int16Array(audioData.buffer);
              audioQueueRef.current.push(pcmData);
              if (!isPlayingRef.current) {
                playNextInQueue();
              }
            }
            
            if (message.serverContent?.modelTurn?.parts[0]?.text) {
              setTranscript(prev => [...prev, { role: 'model', text: message.serverContent!.modelTurn!.parts[0].text! }]);
            }
            
            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
            }
          },
          onclose: () => {
            setIsConnected(false);
            stopAudioCapture();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setIsConnecting(false);
          }
        }
      });
      
      sessionRef.current = session;
    } catch (err) {
      console.error("Failed to connect to Live API:", err);
      setIsConnecting(false);
    }
  };

  const base64ToUint8Array = (base64: string) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const startAudioCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(audioContext.destination);
      
      processor.onaudioprocess = (e) => {
        if (isMuted) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        
        // Calculate audio level for UI
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average / 128);
        
        if (sessionRef.current) {
          const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
          sessionRef.current.sendRealtimeInput({
            media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        }
      };
      
      setIsRecording(true);
    } catch (err) {
      console.error("Error capturing audio:", err);
    }
  };

  const playNextInQueue = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }
    
    isPlayingRef.current = true;
    const pcmData = audioQueueRef.current.shift()!;
    
    if (!audioContextRef.current) return;
    
    const buffer = audioContextRef.current.createBuffer(1, pcmData.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < pcmData.length; i++) {
      channelData[i] = pcmData[i] / 0x7FFF;
    }
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.onended = playNextInQueue;
    source.start();
  };

  const stopAudioCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsRecording(false);
  };

  const handleClose = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
    }
    stopAudioCapture();
    onClose();
  };

  useEffect(() => {
    startSession();
    return () => {
      if (sessionRef.current) sessionRef.current.close();
      stopAudioCapture();
    };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-obsidian/90 backdrop-blur-xl"
    >
      <div className="relative w-full max-w-2xl bg-charcoal-rich border border-emas-sadur/20 rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-8 py-6 border-b border-emas-sadur/10 flex justify-between items-center bg-emas-sadur/5">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 border border-emas-sadur flex items-center justify-center rotate-45">
              <Sparkles size={18} className="text-emas-sadur rotate-[-45deg]" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-emas-sadur uppercase tracking-widest">Bentara Live</h3>
              <p className="text-[9px] tracking-[0.3em] text-emas-sadur/60 font-bold uppercase">Konsultasi Diraja Real-Time</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-emas-sadur/10 rounded-full text-emas-sadur/60 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="h-[400px] overflow-y-auto p-8 space-y-6 scrollbar-hide">
          {isConnecting && (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="w-12 h-12 border-2 border-emas-sadur/20 border-t-emas-sadur rounded-full animate-spin"></div>
              <p className="text-emas-sadur/60 text-xs tracking-widest uppercase animate-pulse">Menghubungkan ke Arkib...</p>
            </div>
          )}
          
          {!isConnecting && isConnected && (
            <div className="flex flex-col items-center justify-center h-full space-y-12">
              <div className="relative">
                {/* Pulse Animation */}
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.1, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-[-40px] border-2 border-emas-sadur rounded-full"
                />
                <motion.div 
                  animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.05, 0.1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute inset-[-80px] border border-emas-sadur rounded-full"
                />
                
                {/* Audio Visualizer Ring */}
                <div className="w-48 h-48 rounded-full border-2 border-emas-sadur/20 flex items-center justify-center bg-emas-sadur/5 relative z-10">
                  <motion.div 
                    animate={{ scale: 1 + audioLevel * 0.5 }}
                    className="w-32 h-32 rounded-full bg-emas-sadur/10 border border-emas-sadur/30 flex items-center justify-center"
                  >
                    <Mic size={48} className={isMuted ? 'text-emas-sadur/20' : 'text-emas-sadur'} />
                  </motion.div>
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <h4 className="text-emas-sadur text-sm font-bold tracking-[0.3em] uppercase">
                  {isMuted ? 'Mikrofon Dimatikan' : 'Bentara Sedia Mendengar'}
                </h4>
                <p className="text-ivory/40 text-xs italic">"Sila ajukan sebarang kemusykilan atau arahan..."</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="px-8 py-8 border-t border-emas-sadur/10 bg-emas-sadur/5 flex justify-center items-center space-x-12">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-full border transition-all duration-500 ${isMuted ? 'border-crimson-regal/40 text-crimson-regal bg-crimson-regal/5' : 'border-emas-sadur/20 text-emas-sadur hover:bg-emas-sadur/10'}`}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
          
          <div className="flex items-center space-x-2">
            {[...Array(5)].map((_, i) => (
              <motion.div 
                key={i}
                animate={{ height: isConnected && !isMuted ? [8, 24, 8] : 8 }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                className="w-1 bg-emas-sadur/40 rounded-full"
              />
            ))}
          </div>

          <button className="p-4 rounded-full border border-emas-sadur/20 text-emas-sadur hover:bg-emas-sadur/10 transition-all">
            <Volume2 size={24} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default LiveConsultant;
