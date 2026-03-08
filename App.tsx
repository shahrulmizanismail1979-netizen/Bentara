/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { Mic, Upload, Sparkles, AlertTriangle, Moon, Sun, Briefcase, GraduationCap, Scale, Globe, LogIn, LogOut, History, X, Archive } from 'lucide-react';
import AudioRecorder from './components/AudioRecorder';
import FileUploader from './components/FileUploader';
import TranscriptionDisplay from './components/TranscriptionDisplay';
import Button from './components/Button';
import LiveConsultant from './components/LiveConsultant';
import { transcribeAudio, transcribeAudioStream } from './services/geminiService';
import { AppStatus, AudioData, TranscriptionResponse, TranscriptionContext } from './types';
import { auth, signInWithGoogle, logout, saveTranscription, subscribeToTranscriptions, SavedTranscription } from './firebase';
import { onAuthStateChanged, User, GoogleAuthProvider } from 'firebase/auth';
import { AnimatePresence, motion } from 'framer-motion';

function App() {
  const [mode, setMode] = useState<'record' | 'upload'>('record');
  const [context, setContext] = useState<TranscriptionContext>('general');
  const [currentLang, setCurrentLang] = useState<'BM' | 'EN' | 'ZH'>('BM');
  const [useGrounding, setUseGrounding] = useState(false);
  const [isLiveOpen, setIsLiveOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(localStorage.getItem('google_access_token'));
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [history, setHistory] = useState<SavedTranscription[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        const unsubHistory = subscribeToTranscriptions(u.uid, (data) => {
          setHistory(data);
        });
        return () => unsubHistory();
      } else {
        setHistory([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSaveToArchive = async () => {
    if (!user || !result) return;
    setIsSaving(true);
    try {
      const title = result.markdown.split('\n')[0].replace('# ', '') || 'Warkah Tanpa Tajuk';
      await saveTranscription(user.uid, title, result.markdown, context);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const translations = {
    BM: {
      tagline: 'SISTEM TRANSKRIPSI DIRAJA',
      mainTitle: <>Arkib Minit & <br />Wacana Digital</>,
      subtitle: '"Menelusuri bicara, mengabadikan wacana. Transformasi kecerdasan buatan dalam memartabatkan khazanah persidangan dan mesyuarat rasmi."',
      button1: 'RAKAMAN SUARA',
      button2: 'MUAT NAIK FAIL',
      larasBahasa: 'Laras Bahasa',
      janaTranskripsi: 'Jana Transkripsi',
      menganalisis: 'Menganalisis Wacana',
      processingDesc: (ctx: string) => `"Gemini sedang meneliti intipati bicara, memastikan kepatuhan DBP, dan menjana arkib digital laras ${ctx} anda."`,
      hasilArkib: 'Hasil Arkib Digital',
      menjanaTranskripsi: 'Menjana Transkripsi',
      dokumenRasmi: 'Dokumen Rasmi Bentara',
      arkibBaharu: 'Arkib Baharu',
      utama: 'Utama',
      arkib: 'Arkib',
      general: 'Umum',
      professional: 'Profesional',
      academic: 'Akademik',
      legal: 'Perundangan',
      warkahDigital: 'Warkah Digital Kesultanan',
      logMasuk: 'Log Masuk',
      geminiGrounding: 'Gemini Grounding',
      carianGoogle: 'Carian Google & Peta Real-Time',
      bentaraLive: 'Bentara Live',
      konsultasiRealTime: 'Konsultasi Diraja Real-Time',
      arkibWarkah: 'Arkib Warkah',
      tiadaRekod: 'Tiada rekod dijumpai',
      sesiRakaman: 'Sesi Rakaman',
      menapisSuara: 'Menapis Suara',
      tapisDesc: 'Mengaplikasikan penapis AI premium',
      tangkapanAudio: 'Tangkapan Audio',
      klikMikrofon: 'Klik ikon mikrofon untuk bermula',
      pemantapanAudio: 'Pemantapan Audio AI',
      memproses: 'Memproses...',
      mulakanRakaman: 'Mulakan Rakaman',
      hentikanRakaman: 'Hentikan Rakaman',
      pilihArkib: 'Pilih Arkib',
      fileTypes: 'MP3, WAV, M4A, WEBM (Maks 20MB)',
      menapisKualiti: 'Menapis kualiti suara',
      sediaDianalisis: 'Sedia untuk dianalisis',
      transkrip: 'Transkrip',
      rumusan: 'Rumusan',
      simpanArkib: 'Simpan ke Arkib',
      menyimpan: 'Menyimpan...',
      disimpan: 'Disimpan',
      salin: 'Salin',
      disalin: 'Disalin',
      muatTurun: 'Muat Turun',
      muatTurunWord: 'Muat Turun (Word)',
      eksportGoogleDocs: 'Eksport ke Google Docs',
      menjanaWarkah: 'Menjana Warkah Rasmi...',
      warkahBerjaya: 'Warkah berjaya disimpan',
      menyaringIntipati: 'Menyaring Intipati Wacana',
    },
    EN: {
      tagline: 'ROYAL TRANSCRIPTION SYSTEM',
      mainTitle: <>Digital Minutes & <br />Discourse Archive</>,
      subtitle: '"Tracing the conversation, immortalizing the discourse. Artificial intelligence transformation in elevating the treasures of official conferences and meetings."',
      button1: 'RECORD AUDIO',
      button2: 'UPLOAD FILE',
      larasBahasa: 'Transcription Context',
      janaTranskripsi: 'Generate Transcription',
      menganalisis: 'Analyzing Discourse',
      processingDesc: (ctx: string) => `"Gemini is examining the essence of speech, ensuring DBP compliance, and generating your ${ctx} digital archive."`,
      hasilArkib: 'Digital Archive Results',
      menjanaTranskripsi: 'Generating Transcription',
      dokumenRasmi: 'Bentara Official Document',
      arkibBaharu: 'New Archive',
      utama: 'Home',
      arkib: 'Archive',
      general: 'General',
      professional: 'Professional',
      academic: 'Academic',
      legal: 'Legal',
      warkahDigital: 'Sultanate Digital Archive',
      logMasuk: 'Login',
      geminiGrounding: 'Gemini Grounding',
      carianGoogle: 'Google Search & Real-Time Maps',
      bentaraLive: 'Bentara Live',
      konsultasiRealTime: 'Real-Time Royal Consultation',
      arkibWarkah: 'Document Archive',
      tiadaRekod: 'No records found',
      sesiRakaman: 'Recording Session',
      menapisSuara: 'Filtering Audio',
      tapisDesc: 'Applying premium AI filters',
      tangkapanAudio: 'Audio Capture',
      klikMikrofon: 'Click the microphone icon to start',
      pemantapanAudio: 'AI Audio Enhancement',
      memproses: 'Processing...',
      mulakanRakaman: 'Start Recording',
      hentikanRakaman: 'Stop Recording',
      pilihArkib: 'Select Archive',
      fileTypes: 'MP3, WAV, M4A, WEBM (Max 20MB)',
      menapisKualiti: 'Filtering voice quality',
      sediaDianalisis: 'Ready for analysis',
      transkrip: 'Transcript',
      rumusan: 'Summary',
      simpanArkib: 'Save to Archive',
      menyimpan: 'Saving...',
      disimpan: 'Saved',
      salin: 'Copy',
      disalin: 'Copied',
      muatTurun: 'Download',
      muatTurunWord: 'Download (Word)',
      eksportGoogleDocs: 'Export to Google Docs',
      menjanaWarkah: 'Formatting Official Document...',
      warkahBerjaya: 'Document successfully exported',
      menyaringIntipati: 'Filtering Discourse Essence',
    },
    ZH: {
      tagline: '皇家转录系统',
      mainTitle: <>数字会议记录与<br />话语档案</>,
      subtitle: '"追溯对话，让话语永恒。人工智能转型，提升官方会议与研讨会的珍贵记录。"',
      button1: '录制音频',
      button2: '上传文件',
      larasBahasa: '转录语境',
      janaTranskripsi: '生成转录',
      menganalisis: '分析话语中',
      processingDesc: (ctx: string) => `"Gemini 正在研究演讲的精髓，确保符合 DBP 标准，并生成您的 ${ctx} 数字档案。"`,
      hasilArkib: '数字档案结果',
      menjanaTranskripsi: '正在生成转录',
      dokumenRasmi: 'Bentara 官方文件',
      arkibBaharu: '新建档案',
      utama: '首页',
      arkib: '档案',
      general: '通用',
      professional: '专业',
      academic: '学术',
      legal: '法律',
      warkahDigital: '苏丹国数字档案',
      logMasuk: '登录',
      geminiGrounding: 'Gemini 实时搜索',
      carianGoogle: '谷歌搜索与实时地图',
      bentaraLive: 'Bentara 实时咨询',
      konsultasiRealTime: '实时皇家咨询',
      arkibWarkah: '文档档案',
      tiadaRekod: '未找到记录',
      sesiRakaman: '录音会话',
      menapisSuara: '过滤音频',
      tapisDesc: '应用高级 AI 过滤器',
      tangkapanAudio: '音频采集',
      klikMikrofon: '点击麦克风图标开始',
      pemantapanAudio: 'AI 音频增强',
      memproses: '处理中...',
      mulakanRakaman: '开始录音',
      hentikanRakaman: '停止录音',
      pilihArkib: '选择档案',
      fileTypes: 'MP3, WAV, M4A, WEBM (最大 20MB)',
      menapisKualiti: '过滤语音质量',
      sediaDianalisis: '准备分析',
      transkrip: '转录',
      rumusan: '摘要',
      simpanArkib: '保存到档案',
      menyimpan: '保存中...',
      disimpan: '已保存',
      salin: '复制',
      disalin: '已复制',
      muatTurun: '下载',
      muatTurunWord: '下载 (Word)',
      eksportGoogleDocs: '导出到 Google 文档',
      menjanaWarkah: '正在生成官方文档...',
      warkahBerjaya: '文档已成功导出',
      menyaringIntipati: '过滤话语精髓',
    }
  };

  const handleLogin = async () => {
    try {
      const result = await signInWithGoogle();
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
        localStorage.setItem('google_access_token', credential.accessToken);
      }
    } catch (error) {
      console.error('Login error:', error);
      showToast('Gagal log masuk', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setGoogleAccessToken(null);
      localStorage.removeItem('google_access_token');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const t = translations[currentLang];

  const [appStatus, setAppStatus] = useState<AppStatus>(AppStatus.Idle);
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [result, setResult] = useState<TranscriptionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize dark mode based on system preference
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Toggle Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const handleAudioReady = (data: AudioData) => {
    setAudioData(data);
    setError(null);
    setResult(null); // Clear previous results
  };

  const handleTranscribe = async () => {
    if (!audioData) return;

    setAppStatus(AppStatus.Processing);
    setError(null);
    setResult({ markdown: '' }); // Initialize empty result for streaming

    try {
      const stream = transcribeAudioStream(audioData.base64, audioData.mimeType, context, useGrounding);
      let fullMarkdown = '';
      let lastUpdateTime = Date.now();
      
      for await (const chunk of stream) {
        fullMarkdown += chunk;
        
        // Throttle updates to every 100ms to prevent UI hanging
        const now = Date.now();
        if (now - lastUpdateTime > 100) {
          setResult({ markdown: fullMarkdown });
          lastUpdateTime = now;
        }
      }
      
      // Ensure the final result is set
      setResult({ markdown: fullMarkdown });
      setAppStatus(AppStatus.Success);
    } catch (err) {
      console.error(err);
      setError("An error occurred during transcription. Please try again.");
      setAppStatus(AppStatus.Error);
    }
  };

  const handleReset = () => {
    setAudioData(null);
    setResult(null);
    setAppStatus(AppStatus.Idle);
    setError(null);
  };

  const contexts: { id: TranscriptionContext; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <Globe size={16} /> },
    { id: 'professional', label: 'Professional', icon: <Briefcase size={16} /> },
    { id: 'academic', label: 'Academic', icon: <GraduationCap size={16} /> },
    { id: 'legal', label: 'Legal', icon: <Scale size={16} /> },
  ];

  return (
    <div className="min-h-screen font-sans bg-premium-obsidian relative overflow-hidden">
      {/* Decorative Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-obsidian/50 to-obsidian pointer-events-none"></div>
      
      {/* Header */}
      <header className="relative z-50 px-8 py-10 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 border-2 border-emas-sadur flex items-center justify-center rotate-45 bg-emas-sadur/5 backdrop-blur-sm">
            <div className="rotate-[-45deg] text-emas-sadur font-serif font-bold text-xl">B</div>
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-gold-metallic tracking-widest uppercase">Bentara</h1>
            <p className="text-[9px] tracking-[0.4em] text-emas-sadur/60 font-bold uppercase">{t.warkahDigital}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-8">
           {user ? (
             <div className="flex items-center space-x-6">
               <button 
                 onClick={() => setShowHistory(!showHistory)}
                 className="text-emas-sadur/60 hover:text-emas-sadur transition-colors flex items-center space-x-2"
               >
                 <History size={18} />
                 <span className="text-[10px] font-bold tracking-widest uppercase hidden sm:inline">{t.arkib}</span>
               </button>
               <div className="flex items-center space-x-3 border-l border-emas-sadur/20 pl-6">
                 {user.photoURL && <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-emas-sadur/40" />}
                 <button onClick={handleLogout} className="text-emas-sadur/60 hover:text-emas-sadur transition-colors">
                   <LogOut size={18} />
                 </button>
               </div>
             </div>
           ) : (
             <button 
               onClick={handleLogin}
               className="flex items-center space-x-2 text-emas-sadur/60 hover:text-emas-sadur transition-colors"
             >
               <LogIn size={18} />
               <span className="text-[10px] font-bold tracking-widest uppercase">{t.logMasuk}</span>
             </button>
           )}

           <div className="lang-switcher hidden md:flex relative">
              {['BM', 'EN', 'ZH'].map((lang) => (
                <div 
                  key={lang}
                  onClick={() => setCurrentLang(lang as any)}
                  className={`lang-item relative z-10 ${currentLang === lang ? 'text-emas-sadur' : ''}`}
                >
                  {currentLang === lang && (
                    <motion.div 
                      layoutId="activeLang"
                      className="absolute inset-0 bg-emas-sadur/20 rounded-full shadow-[0_0_20px_rgba(212,175,55,0.3)] border border-emas-sadur/30"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-20">{lang === 'ZH' ? '中文' : lang}</span>
                </div>
              ))}
           </div>
           
           <div className="hidden md:flex items-center space-x-6 text-[10px] tracking-[0.3em] font-bold text-emas-sadur/50 uppercase">
              <span className="hover:text-emas-sadur cursor-pointer transition-colors">{t.utama}</span>
              <span className="hover:text-emas-sadur cursor-pointer transition-colors">{t.arkib}</span>
           </div>
           <button 
            onClick={toggleDarkMode}
            className="p-3 rounded-full btn-glass-gold text-emas-sadur"
            aria-label="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32">
        
        {/* Status Error */}
        {appStatus === AppStatus.Error && error && (
          <div className="mb-12 bg-crimson-regal/10 border-l-4 border-emas-sadur p-6 flex items-start text-emas-sadur animate-in fade-in slide-in-from-top-4">
            <AlertTriangle className="mr-4 flex-shrink-0 mt-0.5" size={24} />
            <p className="font-medium tracking-wide">{error}</p>
          </div>
        )}

        {/* Hero Section */}
        {!result && appStatus !== AppStatus.Processing && (
          <div className="text-center mb-24 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className="inline-block px-4 py-1 border border-emas-sadur/20 bg-emas-sadur/5 backdrop-blur-sm mb-8">
               <span className="text-[9px] tracking-[0.5em] font-bold text-emas-sadur uppercase">{t.tagline}</span>
            </div>
            
            <h2 className="text-6xl md:text-8xl font-serif font-bold text-gold-metallic mb-8 leading-tight tracking-tight">
              {t.mainTitle}
            </h2>
            
            <p className="text-ivory/60 max-w-2xl mx-auto text-lg font-light leading-relaxed tracking-wide mb-12 italic">
              {t.subtitle}
            </p>

            <div className="divider-pucuk-rebung"></div>

            <div className="divider-keris"></div>

            {/* Grounding Toggle */}
            <div className="mt-12 flex flex-col items-center">
              <div className="flex items-center space-x-4 bg-emas-sadur/5 border border-emas-sadur/20 p-4 rounded-xl">
                <div className={`p-2 rounded-lg transition-colors ${useGrounding ? 'bg-emas-sadur text-obsidian' : 'text-emas-sadur/40'}`}>
                  <Globe size={18} />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold tracking-widest text-emas-sadur uppercase">{t.geminiGrounding}</span>
                  <span className="text-[9px] text-ivory/40 italic">{t.carianGoogle}</span>
                </div>
                <button 
                  id="grounding-toggle"
                  onClick={() => setUseGrounding(!useGrounding)}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-500 ${useGrounding ? 'bg-emas-sadur' : 'bg-emas-sadur/20'}`}
                >
                  <motion.div 
                    animate={{ x: useGrounding ? 24 : 4 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg"
                  />
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-10 mt-16">
              <button 
                onClick={() => { setMode('record'); handleReset(); }}
                className={`flex items-center space-x-4 px-10 py-5 btn-glass-gold group ${mode === 'record' ? 'bg-emas-sadur/20 border-emas-sadur/60' : ''}`}
                disabled={false}
              >
                <Mic size={20} className={mode === 'record' ? 'text-emas-sadur' : 'text-emas-sadur/60'} />
                <span className="text-[11px] tracking-[0.3em] font-bold uppercase">{t.button1}</span>
              </button>
              
              <button 
                onClick={() => { setMode('upload'); handleReset(); }}
                className={`flex items-center space-x-4 px-10 py-5 btn-glass-gold group ${mode === 'upload' ? 'bg-emas-sadur/20 border-emas-sadur/60' : ''}`}
                disabled={false}
              >
                <Upload size={20} className={mode === 'upload' ? 'text-emas-sadur' : 'text-emas-sadur/60'} />
                <span className="text-[11px] tracking-[0.3em] font-bold uppercase">{t.button2}</span>
              </button>

              {/* Live Consultant Button */}
              <button 
                id="live-consultant-btn"
                onClick={() => setIsLiveOpen(true)}
                className="flex items-center space-x-4 px-10 py-5 btn-glass-gold group border-emas-sadur/40"
              >
                <Sparkles size={20} className="text-emas-sadur" />
                <span className="text-[11px] tracking-[0.3em] font-bold uppercase">{t.bentaraLive}</span>
              </button>
            </div>

            <div className="mt-24 flex flex-col items-center">
              <div className="flex items-center space-x-4 mb-10">
                <div className="h-[1px] w-12 bg-emas-sadur/20"></div>
                <label className="text-[10px] uppercase tracking-[0.5em] font-bold text-emas-sadur/60">{t.larasBahasa}</label>
                <div className="h-[1px] w-12 bg-emas-sadur/20"></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full max-w-4xl">
                {contexts.map((ctx) => (
                  <button
                    key={ctx.id}
                    onClick={() => setContext(ctx.id)}
                    className={`flex flex-col items-center justify-center px-6 py-10 border transition-all duration-500 relative overflow-hidden group ${
                      context === ctx.id
                        ? 'border-emas-sadur bg-emas-sadur/10 text-emas-sadur shadow-[0_0_30px_rgba(212,175,55,0.1)]'
                        : 'border-emas-sadur/10 text-emas-sadur/40 hover:border-emas-sadur/30 hover:text-emas-sadur/60'
                    }`}
                  >
                    <div className={`absolute top-0 left-0 w-full h-[2px] bg-emas-sadur transition-transform duration-700 ${context === ctx.id ? 'scale-x-100' : 'scale-x-0'}`}></div>
                    <span className={`mb-5 transition-transform duration-500 group-hover:scale-110 ${context === ctx.id ? 'text-emas-sadur' : 'text-emas-sadur/40'}`}>{ctx.icon}</span>
                    <span className="text-[10px] uppercase tracking-[0.3em] font-bold">{(t as any)[ctx.id]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="space-y-24">
          
          {/* Input Section */}
          {!result && appStatus !== AppStatus.Processing && (
            <div className="premium-card p-12 sm:p-24 transition-all duration-700">
              {mode === 'record' ? (
                <AudioRecorder onAudioCaptured={handleAudioReady} disabled={false} t={t} />
              ) : (
                <FileUploader onFileSelected={handleAudioReady} disabled={false} t={t} />
              )}

              {audioData && (
                <div className="mt-20 flex justify-center pt-20 border-t border-emas-sadur/10">
                  <Button 
                    onClick={handleTranscribe} 
                    isLoading={false}
                    disabled={false}
                    className="btn-glass-gold w-full sm:w-96 px-16 py-6 text-emas-sadur uppercase tracking-[0.5em] text-[12px] font-bold hover:shadow-2xl transition-all duration-500"
                  >
                    {t.janaTranskripsi}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Processing State */}
          {appStatus === AppStatus.Processing && !result?.markdown && (
            <div className="premium-card p-32 text-center">
              <div className="flex justify-center mb-20">
                 <div className="relative">
                    <div className="w-40 h-40 border-2 border-emas-sadur/10 border-t-emas-sadur rounded-full animate-spin"></div>
                    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                        <Sparkles size={40} className="text-emas-sadur animate-pulse" />
                    </div>
                 </div>
              </div>
              <h3 className="text-5xl font-serif font-bold text-gold-metallic mb-10 tracking-tight">{t.menganalisis}</h3>
              <p className="text-ivory/50 max-w-lg mx-auto font-light leading-relaxed text-lg tracking-wide italic">
                {t.processingDesc(context)}
              </p>
            </div>
          )}

          {/* Results Section */}
          {result && (appStatus === AppStatus.Success || (appStatus === AppStatus.Processing && result.markdown)) && (
            <div className="space-y-20 animate-in fade-in duration-1000">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-12 mb-20 border-b border-emas-sadur/20 pb-12">
                    <div>
                      <h2 className="text-6xl font-serif font-bold text-gold-metallic tracking-tight">
                        {appStatus === AppStatus.Processing ? t.menjanaTranskripsi : t.hasilArkib}
                      </h2>
                      <p className="text-[10px] uppercase tracking-[0.5em] text-emas-sadur/60 mt-4 font-bold">{t.dokumenRasmi}</p>
                    </div>
                    <Button 
                      onClick={handleReset} 
                      variant="secondary" 
                      disabled={appStatus === AppStatus.Processing}
                      className="btn-glass-gold px-10 py-4 text-[11px] uppercase tracking-[0.4em] font-bold text-emas-sadur transition-all"
                    >
                      {t.arkibBaharu}
                    </Button>
                </div>
                <TranscriptionDisplay 
            data={result} 
            audioData={audioData} 
            isLoggedIn={!!user}
            isSaving={isSaving}
            onSave={handleSaveToArchive}
            t={t}
            googleAccessToken={googleAccessToken}
            showToast={showToast}
          />
            </div>
          )}
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className="fixed bottom-12 right-12 z-50 animate-in fade-in slide-in-from-right-10 duration-500">
            <div className={`px-10 py-5 rounded-sm border ${toast.type === 'success' ? 'bg-obsidian/90 border-emas-sadur text-emas-sadur shadow-[0_0_30px_rgba(212,175,55,0.2)]' : 'bg-red-900/90 border-red-500 text-red-200'} flex items-center gap-6`}>
              <div className={`w-2 h-2 rotate-45 ${toast.type === 'success' ? 'bg-emas-sadur' : 'bg-red-500'}`} />
              <span className="text-[11px] uppercase tracking-[0.4em] font-bold">{toast.message}</span>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-48 text-center text-[10px] text-emas-sadur/40 max-w-4xl mx-auto leading-loose border-t border-emas-sadur/10 pt-24 uppercase tracking-[0.4em] font-medium">
            <p className="mb-10">
            Segala kandungan yang dimuat naik adalah di bawah tanggungjawab pengguna sepenuhnya. Pastikan anda mempunyai hak ke atas kandungan tersebut mengikut undang-undang harta intelek dan privasi. Penggunaan perkhidmatan AI generatif ini tertakluk kepada <a href="https://policies.google.com/terms/generative-ai/use-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-emas-sadur transition-colors">Dasar Penggunaan Dilarang</a> kami.
            </p>
            <p>
            Sila ambil maklum bahawa data yang dimuat naik mungkin digunakan untuk tujuan pembangunan produk Google mengikut <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-emas-sadur transition-colors">terma perkhidmatan</a> yang ditetapkan.
            </p>
        </div>

      </main>

      {/* Live Consultant Modal */}
      <AnimatePresence>
        {isLiveOpen && (
          <LiveConsultant 
            context={context} 
            onClose={() => setIsLiveOpen(false)} 
          />
        )}
      </AnimatePresence>

      {/* History Drawer */}
      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-charcoal-rich border-l border-emas-sadur/20 z-[60] shadow-2xl p-8"
          >
            <div className="flex justify-between items-center mb-12">
              <h3 className="text-xl font-serif font-bold text-emas-sadur uppercase tracking-widest">{t.arkibWarkah}</h3>
              <button onClick={() => setShowHistory(false)} className="text-emas-sadur/60 hover:text-emas-sadur">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-6 overflow-y-auto h-[calc(100vh-200px)] pr-4 scrollbar-hide">
              {history.length === 0 ? (
                <div className="text-center py-20 opacity-40">
                  <Archive size={48} className="mx-auto mb-4" />
                  <p className="text-xs uppercase tracking-widest">{t.tiadaRekod}</p>
                </div>
              ) : (
                history.map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => {
                      setResult({ markdown: item.markdown });
                      setContext(item.context as any);
                      setAppStatus(AppStatus.Success);
                      setShowHistory(false);
                    }}
                    className="w-full text-left p-6 border border-emas-sadur/10 hover:border-emas-sadur/40 bg-emas-sadur/5 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] uppercase tracking-widest text-emas-sadur/60 font-bold">{item.context}</span>
                      <span className="text-[9px] text-ivory/40">{item.timestamp.toDate().toLocaleDateString()}</span>
                    </div>
                    <h4 className="text-ivory font-bold group-hover:text-emas-sadur transition-colors">{item.title}</h4>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
