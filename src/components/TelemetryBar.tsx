import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Bell, BellOff, ShieldAlert, Cpu, Radio, Sparkles } from 'lucide-react';
import { SystemTelemetry } from '../types';

interface TelemetryBarProps {
  telemetry: SystemTelemetry;
  voiceMuted: boolean;
  soundFxMuted: boolean;
  onToggleVoice: () => void;
  onToggleSoundFx: () => void;
  geminiConnected: boolean;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  telemetry,
  voiceMuted,
  soundFxMuted,
  onToggleVoice,
  onToggleSoundFx,
  geminiConnected,
}) => {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toTimeString().split(' ')[0] + ' ' + (now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full bg-slate-950/70 border-b border-cyan-900/50 backdrop-blur-md px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono relative z-20">
      {/* Left: Brand & Core Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4] animate-pulse" />
          <span className="font-display text-sm font-bold tracking-widest text-cyan-200">
            J.A.R.V.I.S.
          </span>
          <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60 text-[10px] text-cyan-300 font-semibold">
            MARK VII
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2 pl-3 border-l border-cyan-900/60 text-cyan-400/80">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>SYS STATUS: <strong className="text-emerald-400">OPTIMAL</strong></span>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 pl-3 border-l border-cyan-900/60">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400">NEURAL CORE:</span>
          <span className={geminiConnected ? 'text-cyan-300 font-semibold' : 'text-slate-300'}>
            {geminiConnected ? 'GEMINI 3.8 FLASH' : 'LOCAL ENGINE'}
          </span>
        </div>
      </div>

      {/* Center: Live Telemetry Diagnostics */}
      <div className="hidden sm:flex items-center gap-4 text-[11px] text-cyan-300/80">
        <div className="flex items-center gap-1.5 bg-slate-900/50 px-2.5 py-1 rounded border border-cyan-900/40">
          <Cpu className="w-3 h-3 text-cyan-400" />
          <span>CPU:</span>
          <span className="text-cyan-200 font-semibold">{telemetry.cpuUsage.toFixed(1)}%</span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900/50 px-2.5 py-1 rounded border border-cyan-900/40">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>REACTOR:</span>
          <span className="text-cyan-200 font-semibold">{telemetry.reactorEfficiency.toFixed(1)}%</span>
        </div>

        <div className="hidden xl:flex items-center gap-1.5 bg-slate-900/50 px-2.5 py-1 rounded border border-cyan-900/40">
          <span>LATENCY:</span>
          <span className="text-emerald-400 font-semibold">{telemetry.neuralLatencyMs}ms</span>
        </div>
      </div>

      {/* Right: Controls and Clock */}
      <div className="flex items-center gap-3">
        {/* Voice output toggle */}
        <button
          id="btn-toggle-voice"
          onClick={onToggleVoice}
          title={voiceMuted ? 'Unmute voice synthesis' : 'Mute voice synthesis'}
          className={`p-1.5 rounded border transition-colors flex items-center gap-1 ${
            voiceMuted
              ? 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
              : 'bg-cyan-950/60 border-cyan-700/60 text-cyan-300 hover:border-cyan-500'
          }`}
        >
          {voiceMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-300" />}
          <span className="hidden sm:inline text-[10px] uppercase">{voiceMuted ? 'VOICE OFF' : 'VOICE ON'}</span>
        </button>

        {/* Audio FX toggle */}
        <button
          id="btn-toggle-sound-fx"
          onClick={onToggleSoundFx}
          title={soundFxMuted ? 'Enable UI sound effects' : 'Disable UI sound effects'}
          className={`p-1.5 rounded border transition-colors flex items-center gap-1 ${
            soundFxMuted
              ? 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
              : 'bg-cyan-950/60 border-cyan-700/60 text-cyan-300 hover:border-cyan-500'
          }`}
        >
          {soundFxMuted ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5 text-cyan-300" />}
          <span className="hidden sm:inline text-[10px] uppercase">{soundFxMuted ? 'FX OFF' : 'FX ON'}</span>
        </button>

        {/* Clock */}
        <div className="px-2.5 py-1 rounded bg-slate-900/80 border border-cyan-900/50 text-cyan-300 text-[11px] font-semibold tracking-wider">
          {timeStr}
        </div>
      </div>
    </header>
  );
};
