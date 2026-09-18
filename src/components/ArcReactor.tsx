import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff, Volume2, Cpu, Activity } from 'lucide-react';
import { SystemState } from '../types';

interface ArcReactorProps {
  state: SystemState;
  isListening: boolean;
  isSpeaking: boolean;
  isWakeMode?: boolean;
  audioLevels?: number[];
  onClick: () => void;
  activeTaskCount: number;
}

export const ArcReactor: React.FC<ArcReactorProps> = ({
  state,
  isListening,
  isSpeaking,
  isWakeMode = true,
  audioLevels = [],
  onClick,
  activeTaskCount,
}) => {
  // Determine core colors based on state
  const { coreColor, ringColor, glowColor, stateLabel, badgeBg } = useMemo(() => {
    switch (state) {
      case 'WAKE_DETECTED':
        return {
          coreColor: 'from-emerald-400 via-teal-300 to-cyan-400',
          ringColor: 'border-emerald-400',
          glowColor: 'rgba(52, 211, 153, 0.7)',
          stateLabel: 'WAKE DETECTED: AWAITING DIRECTIVE',
          badgeBg: 'bg-emerald-500/30 text-emerald-200 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]',
        };
      case 'LISTENING':
        return {
          coreColor: 'from-emerald-400 via-cyan-400 to-teal-500',
          ringColor: 'border-emerald-400/60',
          glowColor: 'rgba(52, 211, 153, 0.5)',
          stateLabel: isWakeMode ? 'HANDS-FREE LISTENING ACTIVE' : 'VOICE RECOGNITION ACTIVE',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        };
      case 'PROCESSING':
        return {
          coreColor: 'from-amber-400 via-orange-400 to-yellow-500',
          ringColor: 'border-amber-400/60',
          glowColor: 'rgba(245, 158, 11, 0.5)',
          stateLabel: 'SYNAPSE NEURAL COMPUTING',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
      case 'EXECUTING':
        return {
          coreColor: 'from-cyan-400 via-blue-500 to-indigo-500',
          ringColor: 'border-cyan-400/70',
          glowColor: 'rgba(6, 182, 212, 0.6)',
          stateLabel: `EXECUTING AUTOMATIONS (${activeTaskCount})`,
          badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        };
      case 'SPEAKING':
        return {
          coreColor: 'from-blue-400 via-cyan-300 to-sky-500',
          ringColor: 'border-cyan-300/80',
          glowColor: 'rgba(56, 189, 248, 0.6)',
          stateLabel: 'VOCAL SYNTHESIS TRANSMITTING',
          badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        };
      default:
        return {
          coreColor: 'from-cyan-500 via-teal-400 to-blue-600',
          ringColor: isListening && isWakeMode ? 'border-emerald-500/70' : 'border-cyan-500/40',
          glowColor: isListening && isWakeMode ? 'rgba(52, 211, 153, 0.45)' : 'rgba(6, 182, 212, 0.35)',
          stateLabel: isListening && isWakeMode
            ? 'LISTENING • SAY "HEY JARVIS"'
            : isListening
            ? 'VOICE INGRESS ACTIVE'
            : 'ARC REACTOR MARK VII: STANDBY',
          badgeBg: isListening && isWakeMode
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
            : 'bg-cyan-950/60 text-cyan-400 border-cyan-700/50',
        };
    }
  }, [state, activeTaskCount, isWakeMode, isListening]);

  // Generate 16 radial wave bars for audio frequency display
  const frequencyBars = useMemo(() => {
    return Array.from({ length: 16 }).map((_, i) => {
      let heightMultiplier = 0.2;
      if (isSpeaking) {
        heightMultiplier = 0.4 + 0.6 * Math.sin((i + Date.now() / 200) * 0.8);
      } else if (isListening) {
        heightMultiplier = 0.3 + 0.7 * Math.sin((i + Date.now() / 150) * 1.1);
      } else if (state === 'EXECUTING') {
        heightMultiplier = 0.3 + 0.5 * Math.sin(i * 0.5);
      }
      return Math.max(0.15, Math.min(1.0, Math.abs(heightMultiplier)));
    });
  }, [isSpeaking, isListening, state]);

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-3">
      {/* State Status Pill */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mb-4 px-3.5 py-1 rounded-full text-xs font-mono tracking-widest uppercase border flex items-center gap-2 backdrop-blur-md shadow-lg ${badgeBg}`}
      >
        <span className="w-2 h-2 rounded-full bg-current animate-ping" />
        <span className="font-semibold">{stateLabel}</span>
      </motion.div>

      {/* Main Interactive Reactor Core Frame */}
      <div 
        id="arc-reactor-interactive"
        onClick={onClick}
        className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center cursor-pointer group transition-transform duration-300 hover:scale-105 active:scale-95"
        title={isListening ? "Click to stop listening" : "Click to activate JARVIS voice recognition"}
      >
        {/* Ambient Radial Glow */}
        <div 
          className="absolute inset-0 rounded-full transition-all duration-700 blur-2xl opacity-60 group-hover:opacity-90"
          style={{ background: `radial-gradient(circle, ${glowColor} 0%, rgba(0,0,0,0) 70%)` }}
        />

        {/* Outer Telemetry Ring 1 - Slow Clockwise */}
        <div className={`absolute inset-0 rounded-full border border-dashed ${ringColor} animate-spin-slow opacity-60`} />

        {/* Outer Ring Segment Accents */}
        <svg className="absolute inset-0 w-full h-full animate-spin-reverse opacity-75" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="47"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.75"
            strokeDasharray="4, 12, 1, 12, 8, 8"
            className="text-cyan-400"
          />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeDasharray="2, 6"
            className="text-cyan-500/50"
          />
        </svg>

        {/* Inner Gyroscope Ring 2 - Segmented Arcs */}
        <div className="absolute inset-6 rounded-full border border-cyan-500/30 border-t-cyan-400 border-r-transparent border-b-cyan-400/50 border-l-transparent animate-spin-slow" />

        {/* Dynamic Waveform Ring */}
        <div className="absolute inset-10 rounded-full flex items-center justify-center">
          {frequencyBars.map((val, idx) => {
            const angle = (idx / frequencyBars.length) * 360;
            return (
              <div
                key={idx}
                className="absolute origin-center w-full h-full flex justify-center items-start pointer-events-none"
                style={{ transform: `rotate(${angle}deg)` }}
              >
                <div
                  className={`w-0.5 rounded-full transition-all duration-150 ${
                    isListening
                      ? 'bg-emerald-400'
                      : isSpeaking
                      ? 'bg-cyan-300'
                      : 'bg-cyan-500/40'
                  }`}
                  style={{
                    height: `${val * 18}px`,
                    transform: 'translateY(-2px)',
                    boxShadow: isListening || isSpeaking ? '0 0 6px currentColor' : 'none',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Secondary Inner Hex / Circle Reticle */}
        <div className="absolute inset-14 rounded-full border-2 border-cyan-500/40 flex items-center justify-center">
          <div className="w-full h-full rounded-full border border-cyan-300/20 animate-pulse" />
        </div>

        {/* Central Core Sphere */}
        <motion.div
          animate={{
            scale: isListening ? [1, 1.08, 1] : isSpeaking ? [1, 1.05, 1] : 1,
          }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
          className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr ${coreColor} p-[2px] shadow-2xl flex items-center justify-center overflow-hidden`}
        >
          {/* Internal reflective mirror */}
          <div className="w-full h-full rounded-full bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-3 text-center border border-cyan-400/30 relative">
            {/* Core Icon */}
            {isListening ? (
              <Mic className="w-8 h-8 text-emerald-300 animate-bounce" />
            ) : isSpeaking ? (
              <Volume2 className="w-8 h-8 text-cyan-300 animate-pulse" />
            ) : state === 'PROCESSING' ? (
              <Activity className="w-8 h-8 text-amber-300 animate-spin" />
            ) : state === 'EXECUTING' ? (
              <Cpu className="w-8 h-8 text-cyan-400 animate-pulse" />
            ) : (
              <div className="relative">
                <div className="w-6 h-6 rounded-full bg-cyan-400/20 border border-cyan-400 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-300 animate-ping" />
                </div>
              </div>
            )}

            {/* Core Text */}
            <span className="mt-1.5 text-[10px] font-mono uppercase tracking-wider text-cyan-200/90 font-bold">
              {state === 'WAKE_DETECTED'
                ? 'DIRECTIVE'
                : isListening
                ? 'LISTENING'
                : isSpeaking
                ? 'VOICE ON'
                : state === 'EXECUTING'
                ? 'TASKS'
                : 'JARVIS'}
            </span>

            <span className="text-[9px] text-cyan-400/70 font-mono tracking-tighter">
              {state === 'WAKE_DETECTED'
                ? 'SPEAK NOW'
                : isListening
                ? (isWakeMode ? 'HANDS-FREE' : 'TAP TO STOP')
                : (isWakeMode ? 'SAY HEY JARVIS' : 'TAP TO SPEAK')}
            </span>
          </div>
        </motion.div>

        {/* Outer Orbiting Photon Dots */}
        <div className="absolute inset-0 animate-spin-slow pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
        </div>
        <div className="absolute inset-0 animate-spin-reverse pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
        </div>
      </div>

      {/* Voice Instruction subtitle */}
      <p className="mt-3 text-xs font-mono text-cyan-400/70 text-center max-w-md">
        {state === 'WAKE_DETECTED' ? (
          <span className="text-emerald-300 font-bold animate-pulse">
            Wake phrase detected! Speak your directive now...
          </span>
        ) : isListening && isWakeMode ? (
          <span>
            Hands-Free Active: Say <strong className="text-emerald-300">"Hey Jarvis"</strong> or <strong className="text-emerald-300">"Hey Jarvis, [command]"</strong> anytime.
          </span>
        ) : isListening ? (
          <span>
            Microphone active. Speak your command or tap to stop.
          </span>
        ) : (
          'Click Arc Reactor or "ENGAGE JARVIS" to initialize hands-free "Hey Jarvis" detection.'
        )}
      </p>
    </div>
  );
};
