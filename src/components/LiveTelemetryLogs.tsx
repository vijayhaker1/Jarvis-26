import React, { useRef, useEffect } from 'react';
import { Terminal, Trash2, CheckCircle2, AlertCircle, Bot, User, Radio } from 'lucide-react';
import { JarvisMessage } from '../types';

interface LiveTelemetryLogsProps {
  messages: JarvisMessage[];
  onClearLogs: () => void;
}

export const LiveTelemetryLogs: React.FC<LiveTelemetryLogsProps> = ({
  messages,
  onClearLogs,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div id="live-telemetry-section" className="w-full bg-slate-950/70 border border-cyan-900/60 rounded-xl p-4 flex flex-col gap-3 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-900/50 pb-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h2 className="font-display text-sm font-bold tracking-wider text-cyan-100 uppercase">
            LIVE TELEMETRY & COMMAND STREAM
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-cyan-400/70 hidden sm:inline">
            BUFFER: {messages.length} EVENTS
          </span>
          <button
            id="btn-clear-logs"
            onClick={onClearLogs}
            className="p-1 rounded text-cyan-500 hover:text-cyan-200 hover:bg-cyan-950/50 transition-colors"
            title="Clear stream logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Message Feed Window */}
      <div className="h-64 overflow-y-auto pr-2 flex flex-col gap-2.5 font-mono text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-cyan-600/70 text-xs">
            TELEMETRY LINK SYNCHRONIZED. AWAITING AUDIO DIRECTIVES.
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const isSystem = msg.sender === 'system';

            return (
              <div
                key={msg.id}
                className={`p-2.5 rounded-lg border transition-all ${
                  isUser
                    ? 'bg-cyan-950/20 border-cyan-700/50 text-cyan-100'
                    : isSystem
                    ? 'bg-slate-900/40 border-cyan-950 text-cyan-400/80'
                    : 'bg-slate-900/70 border-cyan-800/60 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[10px] mb-1">
                  <div className="flex items-center gap-1.5 font-bold uppercase">
                    {isUser ? (
                      <>
                        <User className="w-3 h-3 text-cyan-400" />
                        <span className="text-cyan-300">USER VOICE INGRESS</span>
                      </>
                    ) : isSystem ? (
                      <>
                        <Radio className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-400">TELEMETRY GRID</span>
                      </>
                    ) : (
                      <>
                        <Bot className="w-3 h-3 text-cyan-300" />
                        <span className="text-cyan-200">J.A.R.V.I.S. VOCAL RELAY</span>
                      </>
                    )}
                  </div>
                  <span className="text-cyan-600 text-[9px]">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {/* Primary Text Content */}
                <div className="whitespace-pre-wrap leading-relaxed">
                  {msg.displayText || msg.text}
                </div>

                {/* Triggered Automation Badges */}
                {msg.tasksTriggered && msg.tasksTriggered.length > 0 && (
                  <div className="mt-2 pt-1.5 border-t border-cyan-900/40 flex flex-wrap gap-1">
                    {msg.tasksTriggered.map((task) => (
                      <span
                        key={task.id}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-[9px] text-cyan-300"
                      >
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        <span>TASK DISPATCHED: {task.title}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
