import React from 'react';
import { Volume2, VolumeX, Sparkles, X, Terminal, Radio, CheckCircle2 } from 'lucide-react';

export interface LatestBriefing {
  prompt: string;
  speech: string;
  displayText: string;
  category: string;
  timestamp: number;
  source?: string;
  model?: string;
}

interface JarvisBriefingHUDProps {
  briefing: LatestBriefing;
  isSpeaking: boolean;
  onReplay: () => void;
  onDismiss: () => void;
}

export const JarvisBriefingHUD: React.FC<JarvisBriefingHUDProps> = ({
  briefing,
  isSpeaking,
  onReplay,
  onDismiss,
}) => {
  const timeStr = new Date(briefing.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return (
    <div
      id="jarvis-briefing-hud"
      className="w-full bg-slate-950/90 border border-cyan-500/60 rounded-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.25)] backdrop-blur-xl flex flex-col gap-3 transition-all animate-fadeIn relative overflow-hidden"
    >
      {/* Top subtle scan line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {isSpeaking && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isSpeaking ? 'bg-cyan-400 shadow-[0_0_8px_#00f0ff]' : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                }`}
              />
            </span>
            <span className="font-mono font-bold text-xs tracking-wider text-cyan-300 uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              J.A.R.V.I.S. VOCAL RELAY
            </span>
          </div>

          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-cyan-950/80 border border-cyan-800 text-cyan-400">
            {briefing.category || 'VOICE'}
          </span>

          {briefing.source === 'openrouter' && (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              OPENROUTER FREE ({briefing.model?.includes('deepseek') ? 'DEEPSEEK V4' : briefing.model?.includes('nex') ? 'NEX AGI' : 'FREE MODEL'})
            </span>
          )}

          {briefing.source === 'gemini' && (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              GEMINI CORE
            </span>
          )}

          {isSpeaking && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30 animate-pulse">
              <Radio className="w-3 h-3 text-cyan-400 animate-spin" />
              TRANSMITTING VOCAL AUDIO...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-cyan-500/80 hidden sm:inline-block">
            {timeStr}
          </span>

          <button
            type="button"
            id="btn-replay-voice"
            onClick={onReplay}
            className="px-2.5 py-1 rounded-md bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-700/70 text-cyan-300 font-mono text-xs flex items-center gap-1.5 transition-all shadow-sm"
            title="Replay Jarvis's vocal reply"
          >
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xs:inline">REPLAY VOICE</span>
          </button>

          <button
            type="button"
            id="btn-dismiss-briefing"
            onClick={onDismiss}
            className="p-1 rounded-md text-cyan-500 hover:text-cyan-200 hover:bg-cyan-950/80 transition-all"
            title="Dismiss briefing"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* User Voice Directive Section */}
      <div className="bg-slate-900/60 border border-cyan-900/40 rounded-lg px-3 py-2 flex items-start gap-2 text-xs font-mono">
        <Terminal className="w-3.5 h-3.5 text-cyan-500 mt-0.5 shrink-0" />
        <div className="flex-1">
          <span className="text-cyan-500/90 font-semibold uppercase text-[10px] block">
            USER DIRECTIVE
          </span>
          <p className="text-cyan-200 mt-0.5 font-medium select-text">
            "{briefing.prompt}"
          </p>
        </div>
      </div>

      {/* Jarvis Answer Text Section */}
      <div className="bg-gradient-to-br from-cyan-950/40 to-slate-950 border border-cyan-500/40 rounded-lg p-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono tracking-wider uppercase text-cyan-400 font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            SYNTHESIZED RESPONSE
          </span>

          {/* Sound waves visualization when speaking */}
          {isSpeaking && (
            <div className="flex items-center gap-0.5 h-3.5">
              <span className="w-1 bg-cyan-400 rounded-full animate-[bounce_0.6s_infinite_100ms] h-full" />
              <span className="w-1 bg-cyan-300 rounded-full animate-[bounce_0.6s_infinite_200ms] h-3/4" />
              <span className="w-1 bg-cyan-400 rounded-full animate-[bounce_0.6s_infinite_300ms] h-full" />
              <span className="w-1 bg-cyan-300 rounded-full animate-[bounce_0.6s_infinite_400ms] h-2/3" />
            </div>
          )}
        </div>

        <p className="text-sm sm:text-base leading-relaxed text-cyan-50 font-sans select-text whitespace-pre-wrap">
          {briefing.displayText || briefing.speech}
        </p>
      </div>
    </div>
  );
};
