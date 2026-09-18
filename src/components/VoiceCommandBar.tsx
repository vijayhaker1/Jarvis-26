import React, { useState } from 'react';
import { Mic, MicOff, Send, Sparkles, Terminal, Radio, ShieldCheck } from 'lucide-react';
import { SystemState } from '../types';

interface VoiceCommandBarProps {
  isListening: boolean;
  isWakeMode: boolean;
  isAwaitingCommand: boolean;
  onToggleListening: () => void;
  onToggleWakeMode: () => void;
  onSubmitCommand: (command: string) => void;
  systemState: SystemState;
  liveTranscript: string;
  isSpeechSupported: boolean;
  hasMicPermissionError?: boolean;
}

const PRESET_COMMANDS = [
  'Hey Jarvis, reply to Pepper',
  'Hey Jarvis, check my mail',
  'Hey Jarvis, run full system diagnostic',
  'Hey Jarvis, morning briefing',
  'Hey Jarvis, dim lab lights to 30%',
  'Hey Jarvis, lock blast doors',
  'Hey Jarvis, activate Deep Work focus protocol',
];

export const VoiceCommandBar: React.FC<VoiceCommandBarProps> = ({
  isListening,
  isWakeMode,
  isAwaitingCommand,
  onToggleListening,
  onToggleWakeMode,
  onSubmitCommand,
  systemState,
  liveTranscript,
  isSpeechSupported,
  hasMicPermissionError = false,
}) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || systemState === 'PROCESSING') return;
    onSubmitCommand(inputText.trim());
    setInputText('');
  };

  const handleChipClick = (cmd: string) => {
    onSubmitCommand(cmd);
  };

  const isActuallyActive = isListening && isWakeMode;

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Hands-Free Wake Word Mode Status Bar */}
      <div className="w-full bg-slate-950/70 border border-cyan-900/60 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <span
              className={`w-3 h-3 rounded-full ${
                isActuallyActive
                  ? 'bg-emerald-400'
                  : isListening
                  ? 'bg-cyan-400'
                  : 'bg-slate-600'
              } shadow-[0_0_8px_currentColor]`}
            />
            {isListening && (
              <span className={`absolute w-5 h-5 rounded-full ${isActuallyActive ? 'bg-emerald-400/40' : 'bg-cyan-400/40'} animate-ping`} />
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-cyan-200">
                WAKE WORD ENGINE:
              </span>
              <span
                className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                  isActuallyActive
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50'
                    : isListening
                    ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/50'
                    : 'bg-slate-900 text-slate-400 border border-slate-700'
                }`}
              >
                {isActuallyActive
                  ? 'HANDS-FREE ACTIVE ("HEY JARVIS")'
                  : isListening
                  ? 'LISTENING (MANUAL MIC)'
                  : 'STANDBY (CLICK TO ENGAGE)'}
              </span>
            </div>
            <span className="text-[11px] text-cyan-400/70 mt-0.5">
              {isAwaitingCommand ? (
                <strong className="text-emerald-300 animate-pulse">
                  Wake word acknowledged! Listening for your command now...
                </strong>
              ) : isActuallyActive ? (
                'Microphone actively listening. Simply say "Hey Jarvis" or "Hey Jarvis, [command]" anytime.'
              ) : hasMicPermissionError ? (
                <span className="text-amber-300">
                  Microphone access pending. Click "ENGAGE JARVIS" to grant browser permission or use buttons below.
                </span>
              ) : (
                'System ready. Click "ENGAGE JARVIS" or the Arc Reactor to enable hands-free listening.'
              )}
            </span>
          </div>
        </div>

        {/* Toggle Hands-Free / Engage Button */}
        <div className="flex items-center gap-2">
          {!isListening ? (
            <button
              id="btn-engage-jarvis"
              type="button"
              onClick={onToggleListening}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/70 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(16,185,129,0.25)] animate-pulse"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>ENGAGE JARVIS</span>
            </button>
          ) : (
            <button
              id="btn-toggle-wake-mode"
              type="button"
              onClick={onToggleWakeMode}
              className={`px-3 py-1.5 rounded-lg border font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${
                isWakeMode
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/30'
                  : 'bg-cyan-950/70 border-cyan-700/60 text-cyan-300 hover:bg-cyan-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>{isWakeMode ? 'HANDS-FREE ON' : 'ENABLE HANDS-FREE'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Voice Transcript Banner (Appears when listening, speaking wake word, or typing) */}
      {(isListening || liveTranscript || isAwaitingCommand) && (
        <div
          className={`w-full border rounded-lg p-3 flex items-center gap-3 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all ${
            isAwaitingCommand
              ? 'bg-emerald-950/50 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse'
              : 'bg-cyan-950/40 border-cyan-500/40'
          }`}
        >
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isAwaitingCommand ? 'bg-emerald-300 animate-ping' : 'bg-cyan-400 animate-ping'
            }`}
          />
          <div className="flex-1 text-sm font-mono text-cyan-200 flex items-center gap-1.5 flex-wrap">
            <span
              className={`font-bold uppercase text-xs ${
                isAwaitingCommand ? 'text-emerald-300' : 'text-cyan-400/80'
              }`}
            >
              {isAwaitingCommand ? 'WAKE ACKNOWLEDGED:' : 'AUDIO INGRESS:'}
            </span>
            <span>
              "{liveTranscript || (isAwaitingCommand ? 'Speak your command now, sir...' : 'Listening...')}"
            </span>
          </div>
          <span
            className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${
              isAwaitingCommand
                ? 'bg-emerald-900 text-emerald-200 border-emerald-400 font-bold'
                : 'bg-cyan-950 text-cyan-300 border-cyan-700'
            }`}
          >
            {isAwaitingCommand ? 'AWAITING DIRECTIVE' : 'LIVE STREAM'}
          </span>
        </div>
      )}

      {/* Main Command Input Box */}
      <form
        onSubmit={handleSubmit}
        className="w-full flex items-center gap-2 bg-slate-950/80 border border-cyan-800/60 rounded-xl p-2 shadow-xl focus-within:border-cyan-400/80 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all"
      >
        {/* Voice Input Trigger Button */}
        <button
          type="button"
          id="btn-voice-mic"
          onClick={onToggleListening}
          className={`relative p-3 rounded-lg flex items-center justify-center transition-all ${
            isAwaitingCommand
              ? 'bg-emerald-400 text-slate-950 shadow-[0_0_20px_#34d399] animate-pulse'
              : isListening
              ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_#10b981]'
              : 'bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300'
          }`}
          title={
            !isSpeechSupported
              ? 'Speech recognition not supported in this browser environment. You can use keyboard input.'
              : isListening
              ? 'Continuous listening active (Say "Hey Jarvis")'
              : 'Start listening'
          }
        >
          {isListening ? (
            <>
              <Mic className="w-5 h-5 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping" />
            </>
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>

        {/* Text Input for Typing Directives */}
        <div className="flex-1 flex items-center gap-2 px-2">
          <Terminal className="w-4 h-4 text-cyan-500/70 hidden sm:block" />
          <input
            id="jarvis-command-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isWakeMode
                ? 'Hands-free active: Say "Hey Jarvis [command]" or type here...'
                : 'Speak "Hey Jarvis" or type a command (e.g. "Run diagnostics", "Dim lights to 30%")...'
            }
            className="w-full bg-transparent text-cyan-100 placeholder:text-cyan-600/70 font-mono text-sm focus:outline-none"
            disabled={systemState === 'PROCESSING'}
          />
        </div>

        {/* Execute Command Button */}
        <button
          type="submit"
          id="btn-submit-command"
          disabled={!inputText.trim() || systemState === 'PROCESSING'}
          className="px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-40 disabled:hover:bg-cyan-600 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 transition-all shadow-md"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">EXECUTE</span>
        </button>
      </form>

      {/* Preset Command Suggestion Chips */}
      <div className="w-full flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <div className="flex items-center gap-1 text-cyan-500/80 font-mono text-[11px] whitespace-nowrap pl-1">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>QUICK COMMANDS:</span>
        </div>
        {PRESET_COMMANDS.map((cmd, i) => (
          <button
            key={i}
            id={`preset-chip-${i}`}
            type="button"
            onClick={() => handleChipClick(cmd)}
            className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-900/90 hover:bg-cyan-950 border border-cyan-900/60 hover:border-cyan-500/70 text-cyan-300/80 hover:text-cyan-100 transition-all font-mono text-[11px]"
          >
            {cmd}
          </button>
        ))}
      </div>
    </div>
  );
};
