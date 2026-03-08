/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef } from 'react';
import { UploadCloud, FileAudio, X, Wand2, Loader2 } from 'lucide-react';
import { AudioData } from '../types';
import { enhanceAudio } from '../services/audioEnhancementService';

interface FileUploaderProps {
  onFileSelected: (audioData: AudioData) => void;
  disabled?: boolean;
  t: any;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelected, disabled, t }) => {
  const [dragActive, setDragActive] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [shouldEnhance, setShouldEnhance] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      alert("Please upload a valid audio file.");
      return;
    }

    setFileName(file.name);

    let blob: Blob = file;
    if (shouldEnhance) {
      setIsEnhancing(true);
      try {
        blob = await enhanceAudio(file);
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
      
      onFileSelected({
        blob,
        base64,
        mimeType: blob.type
      });
    };
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  // Keyboard support for activating the file input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="audio/*,video/*"
        onChange={handleChange}
        disabled={disabled}
      />
      
      {!fileName ? (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Upload audio file"
          className={`flex flex-col items-center justify-center p-28 border border-emas-sadur/20 transition-all duration-700 outline-none ${
            dragActive 
              ? "bg-emas-sadur/10 border-emas-sadur/50 shadow-inner" 
              : "hover:bg-emas-sadur/5 hover:border-emas-sadur/40"
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={handleKeyDown}
        >
          <div className="p-10 bg-emas-sadur/10 text-emas-sadur rounded-full mb-12 shadow-sm border border-emas-sadur/20">
            <UploadCloud size={64} strokeWidth={1} />
          </div>
          <p className="text-4xl font-serif font-bold text-gold-metallic mb-6 tracking-tight">
            {t.pilihArkib || 'Pilih Arkib'}
          </p>
          <p className="text-[11px] uppercase tracking-[0.5em] font-bold text-emas-sadur/60">
            {t.fileTypes || 'MP3, WAV, M4A, WEBM (Maks 20MB)'}
          </p>

          <div className="mt-14 flex items-center space-x-8 p-6 bg-emas-sadur/5 border border-emas-sadur/20 shadow-sm" onClick={(e) => e.stopPropagation()}>
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
        </div>
      ) : (
        <div className="border border-emas-sadur/30 p-14 flex items-center justify-between transition-all duration-700 bg-charcoal-rich/40 backdrop-blur-md shadow-2xl">
          <div className="flex items-center space-x-12">
            <div className="p-8 bg-emas-sadur/10 text-emas-sadur shadow-sm border border-emas-sadur/20">
              {isEnhancing ? <Loader2 size={48} className="animate-spin" strokeWidth={1} /> : <FileAudio size={48} strokeWidth={1} />}
            </div>
            <div>
              <p className="text-3xl font-serif font-bold text-gold-metallic truncate max-w-[200px] sm:max-w-md tracking-tight">{fileName}</p>
              <p className="text-[11px] uppercase tracking-[0.5em] font-bold text-emas-sadur/60 mt-4">
                {isEnhancing ? (t.menapisKualiti || 'Menapis kualiti suara') : (t.sediaDianalisis || 'Sedia untuk dianalisis')}
              </p>
            </div>
          </div>
          <button 
            onClick={handleClear}
            className="p-4 text-emas-sadur/40 hover:text-emas-sadur hover:bg-emas-sadur/10 rounded-full transition-all focus:outline-none"
            disabled={disabled}
            aria-label="Remove file"
          >
            <X size={28} />
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUploader;