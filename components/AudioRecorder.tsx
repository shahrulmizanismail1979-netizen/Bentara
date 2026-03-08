/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, AlertCircle, Wand2 } from 'lucide-react';
import Button from './Button';
import { AudioData } from '../types';
import { enhanceAudio } from '../services/audioEnhancementService';

interface AudioRecorderProps {
  onAudioCaptured: (audioData: AudioData) => void;
  disabled?: boolean;
  t: any;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onAudioCaptured, disabled, t }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [shouldEnhance, setShouldEnhance] = useState(true);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        let blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        if (shouldEnhance) {
          setIsEnhancing(true);
          try {
            blob = await enhanceAudio(blob);
          } catch (err) {
            console.error("Enhancement failed, using original:", err);
          } finally {
            setIsEnhancing(false);
          }
        }

        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const base64 = base64String.split(',')[1];
          
          onAudioCaptured({
            blob,
            base64,
            mimeType: blob.type
          });
        };
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Timer
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Could not access microphone. Please ensure permissions are granted.");
    }
  }, [onAudioCaptured]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setDuration(0);
    }
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center transition-all duration-700">
      <div className={`relative flex items-center justify-center w-44 h-44 mb-14 rounded-full transition-all duration-1000 border ${isRecording ? 'bg-emas-sadur/5 border-emas-sadur/30' : 'bg-emas-sadur/5 border-emas-sadur/10'}`}>
        {isRecording && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-emas-sadur opacity-10 animate-ping"></span>
        )}
        <div className={isRecording ? 'text-emas-sadur' : 'text-emas-sadur/40'}>
          <Mic size={80} strokeWidth={1} className={isRecording ? 'animate-pulse' : ''} />
        </div>
      </div>

      <div className="text-center mb-14">
        {isRecording ? (
          <div className="animate-in fade-in zoom-in duration-700">
            <h3 className="text-4xl font-serif font-bold text-gold-metallic tracking-tight">{t.sesiRakaman || 'Sesi Rakaman'}</h3>
            <p className="text-7xl font-light tracking-[0.3em] text-ivory mt-10">{formatTime(duration)}</p>
          </div>
        ) : isEnhancing ? (
          <div className="animate-in fade-in duration-700">
            <h3 className="text-4xl font-serif font-bold text-gold-metallic tracking-tight">{t.menapisSuara || 'Menapis Suara'}</h3>
            <p className="text-[11px] uppercase tracking-[0.5em] font-bold text-emas-sadur/60 mt-8">{t.tapisDesc || 'Mengaplikasikan penapis AI premium'}</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-700">
            <h3 className="text-4xl font-serif font-bold text-gold-metallic tracking-tight">{t.tangkapanAudio || 'Tangkapan Audio'}</h3>
            <p className="text-[11px] uppercase tracking-[0.5em] font-bold text-emas-sadur/60 mt-8">{t.klikMikrofon || 'Klik ikon mikrofon untuk bermula'}</p>
          </div>
        )}
      </div>

      {!isRecording && !isEnhancing && (
        <div className="flex items-center space-x-8 mb-14 p-6 border border-emas-sadur/20 bg-emas-sadur/5 shadow-sm">
          <button
            onClick={() => setShouldEnhance(!shouldEnhance)}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-500 focus:outline-none border border-emas-sadur/30 ${shouldEnhance ? 'bg-emas-sadur/20' : 'bg-obsidian'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-emas-sadur shadow-lg transition-transform duration-500 ${shouldEnhance ? 'translate-x-8' : 'translate-x-1'}`} />
          </button>
          <span className="text-[11px] uppercase tracking-[0.4em] font-bold text-emas-sadur/80 flex items-center">
            <Wand2 size={16} className="mr-4 text-emas-sadur" />
            {t.pemantapanAudio || 'Pemantapan Audio AI'}
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center text-red-400 bg-red-900/20 border border-red-900/40 px-6 py-3 rounded-sm mb-6 text-[11px] uppercase tracking-widest font-bold">
          <AlertCircle size={18} className="mr-3" />
          {error}
        </div>
      )}

      {!isRecording ? (
        <Button 
          onClick={startRecording} 
          disabled={disabled || isEnhancing}
          className="w-full max-w-sm btn-glass-gold py-5 text-[12px] uppercase tracking-[0.5em] font-bold text-emas-sadur"
          isLoading={isEnhancing}
        >
          {isEnhancing ? (t.memproses || 'Memproses...') : (t.mulakanRakaman || 'Mulakan Rakaman')}
        </Button>
      ) : (
        <Button 
          onClick={stopRecording} 
          variant="danger"
          icon={<Square size={18} fill="currentColor" />}
          className="w-full max-w-sm bg-red-900/20 border border-red-900/40 text-red-400 py-5 text-[12px] uppercase tracking-[0.5em] font-bold hover:bg-red-900/40 transition-all"
        >
          {t.hentikanRakaman || 'Hentikan Rakaman'}
        </Button>
      )}
    </div>
  );
};

export default AudioRecorder;