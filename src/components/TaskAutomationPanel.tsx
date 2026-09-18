import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle2, 
  Clock, 
  Layers, 
  ShieldAlert, 
  Sun, 
  Cpu, 
  Timer as TimerIcon, 
  Compass, 
  Sparkles,
  RotateCw,
  Plus
} from 'lucide-react';
import { AutomationTask, AutomationWorkflow } from '../types';

interface TaskAutomationPanelProps {
  tasks: AutomationTask[];
  workflows: AutomationWorkflow[];
  onTriggerWorkflow: (workflow: AutomationWorkflow) => void;
  onCancelTask?: (taskId: string) => void;
  onOpenCustomModal: () => void;
  activeTimers: { id: string; label: string; remainingSeconds: number; totalSeconds: number }[];
  onCancelTimer: (id: string) => void;
}

export const TaskAutomationPanel: React.FC<TaskAutomationPanelProps> = ({
  tasks,
  workflows,
  onTriggerWorkflow,
  onCancelTask,
  onOpenCustomModal,
  activeTimers,
  onCancelTimer,
}) => {
  const [activeTab, setActiveTab] = useState<'workflows' | 'active_queue' | 'timers'>('workflows');

  const runningTasks = tasks.filter(t => t.status === 'RUNNING' || t.status === 'QUEUED');
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').slice(0, 5);

  return (
    <div className="w-full bg-slate-950/70 border border-cyan-900/60 rounded-xl p-4 flex flex-col gap-4 backdrop-blur-md">
      {/* Header with Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-cyan-900/50 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h2 className="font-display text-sm font-bold tracking-wider text-cyan-100 uppercase">
            REAL-TIME AUTOMATION ENGINE
          </h2>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-cyan-900/50 text-xs font-mono">
          <button
            id="tab-workflows"
            type="button"
            onClick={() => setActiveTab('workflows')}
            className={`px-3 py-1 rounded transition-all ${
              activeTab === 'workflows'
                ? 'bg-cyan-600 text-slate-950 font-bold shadow'
                : 'text-cyan-400/80 hover:text-cyan-200'
            }`}
          >
            ROUTINES ({workflows.length})
          </button>
          <button
            id="tab-queue"
            type="button"
            onClick={() => setActiveTab('active_queue')}
            className={`px-3 py-1 rounded transition-all flex items-center gap-1 ${
              activeTab === 'active_queue'
                ? 'bg-cyan-600 text-slate-950 font-bold shadow'
                : 'text-cyan-400/80 hover:text-cyan-200'
            }`}
          >
            <span>QUEUE</span>
            {runningTasks.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[10px] flex items-center justify-center font-bold animate-pulse">
                {runningTasks.length}
              </span>
            )}
          </button>
          <button
            id="tab-timers"
            type="button"
            onClick={() => setActiveTab('timers')}
            className={`px-3 py-1 rounded transition-all flex items-center gap-1 ${
              activeTab === 'timers'
                ? 'bg-cyan-600 text-slate-950 font-bold shadow'
                : 'text-cyan-400/80 hover:text-cyan-200'
            }`}
          >
            <span>TIMERS</span>
            {activeTimers.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 text-[10px] flex items-center justify-center font-bold">
                {activeTimers.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: AUTOMATION WORKFLOWS / ROUTINES */}
      {activeTab === 'workflows' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-mono text-cyan-400/70">
            <span>PRE-PROGRAMMED PROTOCOLS (VOICE OR 1-CLICK):</span>
            <button
              id="btn-new-custom-rule"
              onClick={onOpenCustomModal}
              className="flex items-center gap-1 text-cyan-300 hover:text-cyan-100 font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>CUSTOM AUTOMATION</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                id={`workflow-card-${wf.id}`}
                className="bg-slate-900/60 hover:bg-slate-900/90 border border-cyan-900/50 hover:border-cyan-500/60 rounded-lg p-3.5 flex flex-col justify-between gap-3 transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded bg-cyan-950/90 border border-cyan-800/60 text-cyan-300 group-hover:scale-105 transition-transform">
                        {wf.iconName === 'Sun' && <Sun className="w-4 h-4 text-amber-400" />}
                        {wf.iconName === 'Compass' && <Compass className="w-4 h-4 text-cyan-400" />}
                        {wf.iconName === 'ShieldAlert' && <ShieldAlert className="w-4 h-4 text-rose-400" />}
                        {wf.iconName === 'Cpu' && <Cpu className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <div>
                        <h3 className="font-display text-sm font-bold text-cyan-100 group-hover:text-cyan-300 transition-colors">
                          {wf.name}
                        </h3>
                        <p className="text-[11px] font-mono text-cyan-400/70">
                          Trigger: "{wf.triggerPhrase}"
                        </p>
                      </div>
                    </div>

                    <button
                      id={`btn-run-workflow-${wf.id}`}
                      type="button"
                      onClick={() => onTriggerWorkflow(wf)}
                      className="px-2.5 py-1.5 rounded bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 hover:text-slate-950 text-xs font-mono font-bold flex items-center gap-1 transition-all"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>DISPATCH</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 mt-2 font-mono leading-relaxed">
                    {wf.description}
                  </p>
                </div>

                {/* Sub-steps preview */}
                <div className="border-t border-cyan-900/40 pt-2 flex flex-wrap gap-1.5 text-[10px] font-mono text-cyan-400/60">
                  {wf.steps.map((step, idx) => (
                    <span key={step.id} className="bg-slate-950/70 px-2 py-0.5 rounded border border-cyan-950">
                      {idx + 1}. {step.title}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE & COMPLETED REAL-TIME TASKS QUEUE */}
      {activeTab === 'active_queue' && (
        <div className="flex flex-col gap-4">
          {/* Running Tasks */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-mono text-amber-300/90 font-bold flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>ACTIVE EXECUTIONS ({runningTasks.length})</span>
            </h3>

            {runningTasks.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-cyan-900/50 rounded-lg text-xs font-mono text-cyan-600">
                NO ACTIVE TASKS IN PIPELINE. SPEAK OR DISPATCH A ROUTINE.
              </div>
            ) : (
              runningTasks.map((t) => (
                <div
                  key={t.id}
                  className="bg-slate-900/80 border border-cyan-700/60 rounded-lg p-3 flex flex-col gap-2 shadow-lg"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-cyan-200">{t.title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 border border-amber-600 text-amber-300 animate-pulse">
                      {t.status}
                    </span>
                  </div>

                  {t.details && (
                    <p className="text-xs text-cyan-400/80 font-mono">{t.details}</p>
                  )}

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-cyan-900/60">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                      style={{ width: `${t.progress}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Recent Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-cyan-900/40 pt-3">
              <h3 className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>RECENTLY EXECUTED</span>
              </h3>

              <div className="flex flex-col gap-1.5">
                {completedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="bg-slate-900/40 border border-cyan-950 px-3 py-2 rounded flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span className="text-cyan-300">{t.title}</span>
                    </div>
                    <span className="text-[10px] text-cyan-600">
                      {new Date(t.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TIMERS & ALARMS */}
      {activeTab === 'timers' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-mono text-cyan-400/70">
            <span>ACTIVE AUDIO TIMERS & COUNTDOWNS:</span>
          </div>

          {activeTimers.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-cyan-900/50 rounded-lg text-xs font-mono text-cyan-600">
              NO ACTIVE TIMERS. SAY: "SET A 10 MINUTE TIMER" TO ARM ONE.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeTimers.map((timer) => {
                const mins = Math.floor(timer.remainingSeconds / 60);
                const secs = timer.remainingSeconds % 60;
                const progress = ((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100;

                return (
                  <div
                    key={timer.id}
                    className="bg-slate-900/80 border border-cyan-700/60 rounded-lg p-3 flex items-center justify-between gap-3 shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-full bg-cyan-950 border border-cyan-600 text-cyan-300">
                        <TimerIcon className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="font-display text-sm font-bold text-cyan-100">{timer.label}</h4>
                        <span className="text-lg font-mono font-bold text-cyan-300">
                          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onCancelTimer(timer.id)}
                      className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-700 text-rose-300 text-xs font-mono transition-colors"
                    >
                      DISMISS
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
