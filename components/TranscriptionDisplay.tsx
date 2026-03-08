/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import Markdown from 'react-markdown';
import { TranscriptionResponse, AudioData } from '../types';
import { FileText, Download, Copy, Check, Play, Pause, Volume2, Highlighter, List, Type, LayoutDashboard, ArrowDownToLine, Archive, FileDown } from 'lucide-react';
import Button from './Button';
import { Document, Packer, Paragraph, TextRun } from 'docx';

interface TranscriptionDisplayProps {
  data: TranscriptionResponse;
  audioData: AudioData | null;
  onSave?: () => void;
  isLoggedIn?: boolean;
  isSaving?: boolean;
  t: any;
  googleAccessToken?: string | null;
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

const TranscriptionContent = React.memo(({ 
  markdown, 
  scannableMode, 
  activeTab, 
  currentTime, 
  onSeek,
  parseTimestamp,
  activeSegmentId
}: { 
  markdown: string; 
  scannableMode: boolean; 
  activeTab: string; 
  currentTime: number;
  onSeek: (seconds: number) => void;
  parseTimestamp: (ts: string) => number;
  activeSegmentId: string | null;
}) => {
  return (
    <Markdown
      components={{
        p: ({ children }) => {
          if (scannableMode && activeTab === 'transcript') {
            return (
              <div className="flex items-start gap-8 mb-10 group">
                <div className="mt-3 w-2 h-2 rotate-45 bg-emas-sadur/20 group-hover:bg-emas-sadur transition-all duration-500 flex-shrink-0" />
                <p className="m-0 font-light text-ivory/70 leading-relaxed text-lg">{children}</p>
              </div>
            );
          }
          return <p className="mb-8 leading-relaxed text-ivory/70 text-lg font-light">{children}</p>;
        },
        strong: ({ children }) => {
          const text = React.Children.toArray(children).join('');
          if (text.includes('(Language:')) {
            const timestampMatch = text.match(/\[(\d{2}:\d{2}:\d{2})\]/);
            const timestampStr = timestampMatch ? timestampMatch[0] : '';
            const timestampSeconds = timestampStr ? parseTimestamp(timestampStr) : 0;
            const segmentId = `timestamp-${timestampSeconds}`;
            
            const parts = text.split('(Language:');
            if (parts.length === 2) {
              const speakerPart = parts[0].replace(timestampStr, '').trim();
              const language = parts[1].replace('):', '').trim();
              
              return (
                <span 
                   id={segmentId}
                   className={`inline-flex flex-wrap items-center gap-6 mb-4 p-3 transition-all duration-700 border-l-2 ${
                    activeSegmentId === segmentId
                      ? 'bg-emas-sadur/10 border-emas-sadur shadow-[0_0_20px_rgba(212,175,55,0.1)]' 
                      : 'border-transparent'
                  }`}
                >
                  {timestampStr && (
                    <button 
                      onClick={() => onSeek(timestampSeconds)}
                      className="text-[10px] font-mono bg-emas-sadur/10 text-emas-sadur px-4 py-1.5 hover:bg-emas-sadur hover:text-obsidian transition-all uppercase tracking-widest font-bold border border-emas-sadur/20"
                    >
                      {timestampStr}
                    </button>
                  )}
                  <span className="font-serif font-bold text-gold-metallic text-xl">{speakerPart}</span>
                  <span className="text-[9px] uppercase tracking-[0.4em] font-bold px-4 py-1.5 bg-emas-sadur/20 text-emas-sadur border border-emas-sadur/30 shadow-sm">
                    {language}
                  </span>
                </span>
              );
            }
          }
          return <strong className="font-bold text-emas-sadur">{children}</strong>;
        }
      }}
    >
      {markdown}
    </Markdown>
  );
}, (prev, next) => {
  return prev.markdown === next.markdown && 
         prev.scannableMode === next.scannableMode && 
         prev.activeTab === next.activeTab &&
         prev.activeSegmentId === next.activeSegmentId;
});

const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ data, audioData, onSave, isLoggedIn, isSaving, t, googleAccessToken, showToast }) => {
  const [copied, setCopied] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [highlightTerms, setHighlightTerms] = React.useState(false);
  const [scannableMode, setScannableMode] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'transcript' | 'summary'>('transcript');
  const [autoScroll, setAutoScroll] = React.useState(true);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const userHasScrolledRef = React.useRef(false);

  const audioUrl = React.useMemo(() => {
    if (!audioData) return null;
    return URL.createObjectURL(audioData.blob);
  }, [audioData]);

  const splitContent = React.useMemo(() => {
    const parts = data.markdown.split('# Executive Summary');
    return {
      transcript: parts[0] || '',
      summary: parts[1] ? `# Executive Summary\n${parts[1]}` : ''
    };
  }, [data.markdown]);

  const formattedMarkdown = React.useMemo(() => {
    let md = activeTab === 'transcript' ? splitContent.transcript : splitContent.summary;
    if (highlightTerms && activeTab === 'transcript') {
      // Regex to bold potential key terms: Dates, Times, Currencies
      const datePattern = /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)\b/gi;
      const timePattern = /\b(\d{1,2}:\d{2}(?:\s*[ap]m)?)\b/gi;
      const currencyPattern = /\b(RM|USD|MYR|\$)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\b/gi;
      
      md = md.replace(datePattern, '**$1**');
      md = md.replace(timePattern, '**$1**');
      md = md.replace(currencyPattern, '**$1**');
    }
    return md;
  }, [splitContent, highlightTerms, activeTab]);

  const timestamps = React.useMemo(() => {
    if (activeTab !== 'transcript') return [];
    const matches = Array.from(splitContent.transcript.matchAll(/\[(\d{2}:\d{2}:\d{2})\]/g));
    return matches.map(match => parseTimestamp(match[1])).sort((a, b) => a - b);
  }, [splitContent.transcript, activeTab]);

  const activeSegmentId = React.useMemo(() => {
    if (activeTab !== 'transcript' || timestamps.length === 0) return null;
    
    // Find the last timestamp that is <= currentTime
    let activeTs = timestamps[0];
    for (const ts of timestamps) {
      if (ts <= currentTime) {
        activeTs = ts;
      } else {
        break;
      }
    }
    
    return `timestamp-${activeTs}`;
  }, [currentTime, timestamps, activeTab]);

  React.useEffect(() => {
    if (autoScroll && activeSegmentId && activeTab === 'transcript' && isPlaying) {
      const element = document.getElementById(activeSegmentId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeSegmentId, autoScroll, activeTab, isPlaying]);

  const handleScroll = () => {
    if (isPlaying) {
      // Logic for user interaction with scroll
    }
  };

  React.useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const lastTimeRef = React.useRef(0);
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const newTime = audioRef.current.currentTime;
      if (Math.floor(newTime) !== Math.floor(lastTimeRef.current)) {
        setCurrentTime(newTime);
        lastTimeRef.current = newTime;
      }
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const seekTo = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const parseTimestamp = (timestamp: string): number => {
    const parts = timestamp.replace('[', '').replace(']', '').split(':');
    if (parts.length === 3) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const s = parseInt(parts[2], 10);
      return h * 3600 + m * 60 + s;
    }
    return 0;
  };

  const handleCopy = () => {
    const content = activeTab === 'transcript' ? splitContent.transcript : splitContent.summary;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = activeTab === 'transcript' ? splitContent.transcript : splitContent.summary;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab === 'transcript' ? 'transcript.md' : 'summary.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadWord = async () => {
    const content = activeTab === 'transcript' ? splitContent.transcript : splitContent.summary;
    
    // Split content into lines and create paragraphs
    const lines = content.split('\n');
    const paragraphs = lines.map(line => {
      // Simple bold detection for markdown
      const boldMatch = line.match(/\*\*(.*?)\*\*/g);
      if (boldMatch) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        const children = parts.map((part, index) => {
          const isBold = index % 2 === 1;
          return new TextRun({
            text: part,
            bold: isBold,
            size: 24, // 12pt
            font: "Inter"
          });
        });
        return new Paragraph({ children });
      }

      return new Paragraph({
        children: [
          new TextRun({
            text: line,
            size: 24,
            font: "Inter"
          }),
        ],
        spacing: { after: 200 }
      });
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: activeTab === 'transcript' ? "BENTARA - TRANSKRIP DIGITAL" : "BENTARA - RUMUSAN EKSEKUTIF",
                bold: true,
                size: 32,
                font: "Inter"
              }),
            ],
            spacing: { after: 400 }
          }),
          ...paragraphs
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab === 'transcript' ? 'transcript.docx' : 'summary.docx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportGoogleDocs = async () => {
    if (!googleAccessToken) {
      showToast?.('Sila log masuk dengan Google untuk eksport', 'error');
      return;
    }

    setIsExporting(true);
    try {
      const content = activeTab === 'transcript' ? splitContent.transcript : splitContent.summary;
      const now = new Date();
      const dateStr = now.toLocaleDateString();
      const timeStr = now.toLocaleTimeString();
      const title = `Bentara - ${activeTab === 'transcript' ? 'Transkrip' : 'Rumusan'} (${dateStr})`;

      // 1. Create the document
      const createResponse = await fetch('https://docs.googleapis.com/v1/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });

      if (!createResponse.ok) throw new Error('Failed to create document');
      const doc = await createResponse.json();
      const documentId = doc.documentId;

      // 2. Prepare formatting requests
      const requests: any[] = [
        // Insert Header
        {
          insertText: {
            location: { index: 1 },
            text: "BENTARA: ARKIB MINIT & WACANA DIGITAL\n\n",
          },
        },
        // Format Header
        {
          updateParagraphStyle: {
            range: { startIndex: 1, endIndex: 38 },
            paragraphStyle: { alignment: 'CENTER' },
            fields: 'alignment',
          },
        },
        {
          updateTextStyle: {
            range: { startIndex: 1, endIndex: 38 },
            textStyle: { bold: true, fontSize: { magnitude: 16, unit: 'PT' }, weightedFontFamily: { fontFamily: 'Times New Roman' } },
            fields: 'bold,fontSize,weightedFontFamily',
          },
        },
        // Insert Metadata
        {
          insertText: {
            location: { index: 39 },
            text: `Tarikh: ${dateStr}\nMasa: ${timeStr}\nBahasa: ${activeTab === 'transcript' ? 'Transkrip Penuh' : 'Rumusan Eksekutif'}\n\n`,
          },
        },
        {
          updateTextStyle: {
            range: { startIndex: 39, endIndex: 39 + 50 }, // Approximate length
            textStyle: { italic: true, fontSize: { magnitude: 11, unit: 'PT' }, weightedFontFamily: { fontFamily: 'Times New Roman' } },
            fields: 'italic,fontSize,weightedFontFamily',
          },
        },
        // Insert Content
        {
          insertText: {
            location: { index: 39 + 60 }, // After metadata
            text: content,
          },
        },
        // Global formatting (Serif font, 1.5 line spacing)
        {
          updateParagraphStyle: {
            range: { startIndex: 1, endIndex: 1 + 39 + 60 + content.length },
            paragraphStyle: { lineSpacing: 150, spaceAbove: { magnitude: 6, unit: 'PT' }, spaceBelow: { magnitude: 6, unit: 'PT' } },
            fields: 'lineSpacing,spaceAbove,spaceBelow',
          },
        },
        {
          updateTextStyle: {
            range: { startIndex: 1, endIndex: 1 + 39 + 60 + content.length },
            textStyle: { weightedFontFamily: { fontFamily: 'Times New Roman' } },
            fields: 'weightedFontFamily',
          },
        },
      ];

      // Bold speaker diarization (e.g., **Speaker 1**)
      // This is a simplified approach, real implementation would need regex matching and index calculation
      const speakerRegex = /\*\*(.*?)\*\*/g;
      let match;
      while ((match = speakerRegex.exec(content)) !== null) {
        requests.push({
          updateTextStyle: {
            range: { 
              startIndex: 39 + 60 + match.index, 
              endIndex: 39 + 60 + match.index + match[0].length 
            },
            textStyle: { bold: true },
            fields: 'bold',
          },
        });
      }

      await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });

      showToast?.(t.warkahBerjaya || 'Warkah berjaya disimpan', 'success');
      window.open(`https://docs.google.com/document/d/${documentId}/edit`, '_blank');
    } catch (error) {
      console.error('Export error:', error);
      showToast?.('Gagal eksport ke Google Docs', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSave = async () => {
    if (onSave) {
      await onSave();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-700">
      {/* Audio Player */}
      {audioUrl && (
        <div className="bg-charcoal-rich/80 backdrop-blur-xl border border-emas-sadur/20 p-10 flex items-center gap-12 sticky top-28 z-40 shadow-2xl transition-all duration-700">
          <audio 
            ref={audioRef} 
            src={audioUrl} 
            onTimeUpdate={handleTimeUpdate} 
            onEnded={() => setIsPlaying(false)}
            className="hidden" 
          />
          <button 
            onClick={togglePlay}
            className="w-20 h-20 flex items-center justify-center rounded-full bg-emas-sadur text-obsidian hover:scale-105 transition-all shadow-[0_0_30px_rgba(212,175,55,0.2)]"
          >
            {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
          </button>
          <div className="flex-1">
            <div className="flex justify-between text-[11px] uppercase tracking-[0.5em] text-emas-sadur mb-5 font-bold">
              <span>{new Date(currentTime * 1000).toISOString().substr(11, 8)}</span>
              <span>{audioRef.current?.duration ? new Date(audioRef.current.duration * 1000).toISOString().substr(11, 8) : '--:--:--'}</span>
            </div>
            <div className="h-[2px] bg-emas-sadur/10 overflow-hidden rounded-full">
              <div 
                className="h-full bg-gradient-to-r from-emas-sadur to-royal-yellow transition-all duration-100" 
                style={{ width: `${(currentTime / (audioRef.current?.duration || 1)) * 100}%` }}
              />
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-emas-sadur/60">
            <Volume2 size={24} />
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 mb-8">
        <div className="flex items-center bg-emas-sadur/5 p-2 border border-emas-sadur/20 shadow-sm">
          <button
            onClick={() => setActiveTab('transcript')}
            className={`flex items-center gap-4 px-10 py-4 text-[11px] uppercase tracking-[0.4em] font-bold transition-all ${activeTab === 'transcript' ? 'bg-emas-sadur text-obsidian shadow-lg' : 'text-emas-sadur/40 hover:text-emas-sadur'}`}
          >
            <FileText size={18} />
            {t.transkrip || 'Transkrip'}
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            disabled={!splitContent.summary}
            className={`flex items-center gap-4 px-10 py-4 text-[11px] uppercase tracking-[0.4em] font-bold transition-all ${!splitContent.summary ? 'opacity-50 cursor-not-allowed' : ''} ${activeTab === 'summary' ? 'bg-emas-sadur text-obsidian shadow-lg' : 'text-emas-sadur/40 hover:text-emas-sadur'}`}
          >
            <LayoutDashboard size={18} />
            {t.rumusan || 'Rumusan'}
          </button>
        </div>
        
        {/* Formatting Toolbar - Only show for transcript */}
        {activeTab === 'transcript' && (
          <div className="flex items-center bg-emas-sadur/5 p-2 border border-emas-sadur/20 shadow-sm">
            <button
              onClick={() => { setHighlightTerms(!highlightTerms); }}
              className={`p-3 transition-all ${highlightTerms ? 'bg-emas-sadur text-obsidian shadow-lg' : 'text-emas-sadur/40 hover:text-emas-sadur'}`}
              title="Highlight Key Terms"
            >
              <Highlighter size={18} />
            </button>
            <div className="w-[1px] h-6 bg-emas-sadur/20 mx-3" />
            <button
              onClick={() => { setScannableMode(!scannableMode); }}
              className={`p-3 transition-all ${scannableMode ? 'bg-emas-sadur text-obsidian shadow-lg' : 'text-emas-sadur/40 hover:text-emas-sadur'}`}
              title="Scannable Mode (Bullet Points)"
            >
              <List size={18} />
            </button>
            <div className="w-[1px] h-6 bg-emas-sadur/20 mx-3" />
            <button
              onClick={() => { setAutoScroll(!autoScroll); }}
              className={`p-3 transition-all ${autoScroll ? 'bg-emas-sadur text-obsidian shadow-lg' : 'text-emas-sadur/40 hover:text-emas-sadur'}`}
              title={autoScroll ? "Disable Auto-scroll" : "Enable Auto-scroll"}
            >
              <ArrowDownToLine size={18} className={autoScroll ? "animate-bounce" : ""} />
            </button>
            <div className="w-[1px] h-6 bg-emas-sadur/20 mx-3" />
            <button
              onClick={() => { setHighlightTerms(false); setScannableMode(false); }}
              className={`p-3 transition-all ${!highlightTerms && !scannableMode ? 'bg-emas-sadur text-obsidian shadow-lg' : 'text-emas-sadur/40 hover:text-emas-sadur'}`}
              title="Standard Mode"
            >
              <Type size={18} />
            </button>
          </div>
        )}

        <div className="flex items-center space-x-4">
          {isLoggedIn && (
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleSave}
              disabled={isSaving || saved}
              icon={saved ? <Check size={18} /> : <Archive size={18} />}
              className="btn-glass-gold px-8 py-4 text-[11px] uppercase tracking-[0.4em] font-bold text-emas-sadur"
            >
              {isSaving ? (t.menyimpan || 'Menyimpan...') : saved ? (t.disimpan || 'Disimpan') : (t.simpanArkib || 'Simpan ke Arkib')}
            </Button>
          )}
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleCopy}
            icon={copied ? <Check size={18} /> : <Copy size={18} />}
            className="btn-glass-gold px-8 py-4 text-[11px] uppercase tracking-[0.4em] font-bold text-emas-sadur"
          >
            {copied ? (t.disalin || 'Disalin') : (t.salin || 'Salin')}
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleDownload}
            icon={<Download size={18} />}
            className="btn-glass-gold px-8 py-4 text-[11px] uppercase tracking-[0.4em] font-bold text-emas-sadur"
          >
            {t.muatTurun || 'Muat Turun'}
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleDownloadWord}
            icon={<FileDown size={18} />}
            className="btn-glass-gold px-8 py-4 text-[11px] uppercase tracking-[0.4em] font-bold text-emas-sadur"
          >
            {t.muatTurunWord || 'Muat Turun (Word)'}
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleExportGoogleDocs}
            isLoading={isExporting}
            icon={<FileText size={18} />}
            className="btn-glass-gold px-8 py-4 text-[11px] uppercase tracking-[0.4em] font-bold text-emas-sadur"
          >
            {isExporting ? (t.menjanaWarkah || 'Menjana Warkah Rasmi...') : (t.eksportGoogleDocs || 'Eksport ke Google Docs')}
          </Button>
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="premium-card overflow-hidden transition-all duration-700 shadow-2xl"
      >
        <div className="p-12 sm:p-28 prose prose-invert max-w-none">
          <div className="markdown-body">
            {activeTab === 'summary' && !splitContent.summary ? (
              <div className="flex flex-col items-center justify-center py-40 text-emas-sadur/40">
                <div className="w-24 h-24 border-2 border-emas-sadur/10 border-t-emas-sadur rounded-full animate-spin mb-12"></div>
                <p className="text-[12px] uppercase tracking-[0.5em] font-bold">{t.menyaringIntipati || 'Menyaring Intipati Wacana'}</p>
              </div>
            ) : (
              <TranscriptionContent 
                markdown={formattedMarkdown}
                scannableMode={scannableMode}
                activeTab={activeTab}
                currentTime={currentTime}
                onSeek={seekTo}
                parseTimestamp={parseTimestamp}
                activeSegmentId={activeSegmentId}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscriptionDisplay;
