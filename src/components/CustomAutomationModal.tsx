import React, { useState } from 'react';
import { X, Plus, Sparkles, Check } from 'lucide-react';
import { AutomationWorkflow } from '../types';

interface CustomAutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveWorkflow: (newWf: AutomationWorkflow) => void;
}

export const CustomAutomationModal: React.FC<CustomAutomationModalProps> = ({
  isOpen,
  onClose,
  onSaveWorkflow,
}) => {
  const [name, setName] = useState('');
  const [triggerPhrase, setTriggerPhrase] = useState('');
  const [description, setDescription] = useState('');
  const [lightAction, setLightAction] = useState('dim');
  const [securityAction, setSecurityAction] = useState('lock');
  const [timerMinutes, setTimerMinutes] = useState('10');

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !triggerPhrase.trim()) return;

    const id = 'custom_' + Date.now();
    const newWorkflow: AutomationWorkflow = {
      id,
      name: name.trim(),
      triggerPhrase: triggerPhrase.trim().toLowerCase(),
      description: description.trim() || `Automated routine triggered by "${triggerPhrase.trim()}"`,
      iconName: 'Cpu',
      color: '#06b6d4',
      active: true,
      steps: [
        {
          id: 'step_1',
          title: `Set Lighting (${lightAction})`,
          actionType: 'ENVIRONMENT_CONTROL',
          durationMs: 800,
        },
        {
          id: 'step_2',
          title: `Configure Security (${securityAction})`,
          actionType: 'ENVIRONMENT_CONTROL',
          durationMs: 900,
        },
        {
          id: 'step_3',
          title: `Start ${timerMinutes}m Timer`,
          actionType: 'TIMER_ALARM',
          durationMs: 600,
        },
      ],
    };

    onSaveWorkflow(newWorkflow);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 border border-cyan-700/70 rounded-xl p-6 shadow-2xl flex flex-col gap-4 font-mono text-cyan-100">
        <div className="flex items-center justify-between border-b border-cyan-900/60 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="font-display text-base font-bold text-cyan-200">
              CREATE AUTOMATION ROUTINE
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-cyan-400 hover:text-cyan-200 hover:bg-cyan-950"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4 text-xs">
          <div>
            <label className="block text-cyan-300 font-bold mb-1">
              ROUTINE NAME:
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cinema Protocol, Study Sprint, Overdrive"
              className="w-full bg-slate-950 border border-cyan-800 rounded px-3 py-2 text-cyan-100 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-cyan-300 font-bold mb-1">
              VOICE TRIGGER PHRASE (Exact or partial):
            </label>
            <input
              type="text"
              required
              value={triggerPhrase}
              onChange={(e) => setTriggerPhrase(e.target.value)}
              placeholder="e.g. cinema mode, activate study, prepare for launch"
              className="w-full bg-slate-950 border border-cyan-800 rounded px-3 py-2 text-cyan-100 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-cyan-300 font-bold mb-1">
              DESCRIPTION:
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this automated sequence does when triggered..."
              className="w-full bg-slate-950 border border-cyan-800 rounded px-3 py-2 text-cyan-100 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-cyan-900/50 pt-3">
            <div>
              <label className="block text-cyan-400 mb-1">LIGHTING ACTION:</label>
              <select
                value={lightAction}
                onChange={(e) => setLightAction(e.target.value)}
                className="w-full bg-slate-950 border border-cyan-800 rounded px-2 py-1.5 text-cyan-100"
              >
                <option value="dim">Dim to 20% (Focus)</option>
                <option value="bright">Max Bright (100%)</option>
                <option value="red">Combat Red</option>
                <option value="emerald">Stealth Emerald</option>
              </select>
            </div>

            <div>
              <label className="block text-cyan-400 mb-1">SECURITY ACTION:</label>
              <select
                value={securityAction}
                onChange={(e) => setSecurityAction(e.target.value)}
                className="w-full bg-slate-950 border border-cyan-800 rounded px-2 py-1.5 text-cyan-100"
              >
                <option value="lock">Lock Blast Doors</option>
                <option value="unlock">Unlock Blast Doors</option>
                <option value="shield">Arm Shields</option>
              </select>
            </div>

            <div>
              <label className="block text-cyan-400 mb-1">TIMER (MINS):</label>
              <input
                type="number"
                min="1"
                max="180"
                value={timerMinutes}
                onChange={(e) => setTimerMinutes(e.target.value)}
                className="w-full bg-slate-950 border border-cyan-800 rounded px-2 py-1.5 text-cyan-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-cyan-900/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold flex items-center gap-1.5 shadow"
            >
              <Check className="w-4 h-4" />
              <span>SAVE PROTOCOL</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
