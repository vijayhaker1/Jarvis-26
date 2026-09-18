import React, { useState, useEffect } from 'react';
import { Volume2, Sparkles, Radio, Sliders, Headphones, Check, Play, X, Activity, Zap, Shield } from 'lucide-react';
import { speechManager, VoiceProfile } from '../utils/speechManager';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface VoicePreset {
  id: VoiceProfile;
  name: string;
  actor: string;
  description: string;
  accent: string;
  neuralModel: string;
  badge?: string;
  isCanon?: boolean;
}

const VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'ironman',
    name: 'Paul Bettany (MCU Iron Man)',
    actor: 'Paul Bettany Authentic Movie Tone',
    description: 'The iconic MCU JARVIS voice from Iron Man 1-3 & The Avengers. Aristocratic British RP, unflappable composure, and subtle dry wit.',
    accent: 'British RP (Stark Laboratory)',
    neuralModel: 'en-GB-RyanNeural (-2Hz Pitch / -2% Cadence)',
    badge: 'MCU CANON',
    isCanon: true,
  },
  {
    id: 'workshop',
    name: 'Stark Workshop Protocol',
    actor: 'Technical Analytical Specialist',
    description: 'Crisper, slightly faster cadence calibrated for rapid CAD engineering, telemetry readouts, and flight trajectory calculations.',
    accent: 'British Analytical (Oliver)',
    neuralModel: 'en-GB-OliverNeural',
  },
  {
    id: 'baritone',
    name: 'Mark VII Tactical Intercom',
    actor: 'Combat Armor In-Helmet System',
    description: 'Deeper baritone acoustic profile tuned for high-velocity combat environments and flight helmet HUD intercom channels.',
    accent: 'British Baritone (Thomas)',
    neuralModel: 'en-GB-ThomasNeural',
  },
  {
    id: 'hindi',
    name: 'J.A.R.V.I.S. Hindi / हिन्दी',
    actor: 'Dignified Imperial Hindi Male',
    description: 'Calm, respectful, and articulate Hindi voice engine with seamless bilingual Stark protocol recognition.',
    accent: 'Hindi-IN (Madhur Neural)',
    neuralModel: 'hi-IN-MadhurNeural',
    badge: 'BILINGUAL',
  },
  {
    id: 'browser',
    name: 'Device Native Fallback',
    actor: 'Local OS Speech Engine',
    description: 'Direct browser speech synthesis calibrated with British male priority and low pitch in case of offline operation.',
    accent: 'Device Native British RP',
    neuralModel: 'Web Speech API (Calibrated)',
  },
];

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeProfile, setActiveProfile] = useState<VoiceProfile>('ironman');
  const [holographicAcoustics, setHolographicAcoustics] = useState<boolean>(true);
  const [isAuditioning, setIsAuditioning] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setActiveProfile(speechManager.getVoiceProfile());
      setHolographicAcoustics(speechManager.getHolographicAcoustics());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectProfile = (profile: VoiceProfile) => {
    setActiveProfile(profile);
    speechManager.setVoiceProfile(profile);
  };

  const handleToggleAcoustics = (enabled: boolean) => {
    setHolographicAcoustics(enabled);
    speechManager.setHolographicAcoustics(enabled);
  };

  const handleAudition = (profileToTest?: VoiceProfile) => {
    setIsAuditioning(true);
    speechManager.primeAudio();
    if (profileToTest && profileToTest !== activeProfile) {
      speechManager.setVoiceProfile(profileToTest);
      setActiveProfile(profileToTest);
    }
    
    let sample = "At your service, sir. All Stark laboratory flight thrusters and perimeter defenses are standing by.";
    if (profileToTest === 'hindi' || activeProfile === 'hindi') {
      sample = "Namaste sir. Stark laboratory ke sabhi systems 100% kshamata par hain. Aapka kya aadesh hai?";
    } else if (profileToTest === 'baritone' || activeProfile === 'baritone') {
      sample = "Flight stabilizers armed, sir. Atmospheric thrusters calibrated to Mach 3.7. Standing by for launch.";
    }

    speechManager.speak(
      sample,
      () => setIsAuditioning(true),
      () => setIsAuditioning(false)
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900/95 border border-cyan-500/50 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-cyan-800/60 bg-gradient-to-r from-slate-950 via-cyan-950/40 to-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Headphones className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-wider text-cyan-100 font-display">
                  J.A.R.V.I.S. VOCAL SYNTHESIS MATRIX
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 tracking-wider">
                  MCU CANON
                </span>
              </div>
              <p className="text-xs text-cyan-400/80 font-mono mt-0.5">
                Paul Bettany Cinematic Neural Acoustic Engine
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-voice-modal"
            onClick={onClose}
            className="p-2 text-cyan-400 hover:text-cyan-100 hover:bg-cyan-950/80 rounded-lg transition-colors border border-transparent hover:border-cyan-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 custom-scrollbar text-sm">
          {/* Quick Audition Banner */}
          <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
                <Activity className={`w-5 h-5 ${isAuditioning ? 'animate-spin text-amber-300' : ''}`} />
              </div>
              <div>
                <div className="text-xs font-mono text-cyan-300 font-semibold">
                  ACTIVE VOCAL CORE: {VOICE_PRESETS.find(p => p.id === activeProfile)?.name}
                </div>
                <div className="text-[11px] text-cyan-400/70">
                  {isAuditioning ? 'Transmitting audio waveform to audio output...' : 'Click to audition authentic Paul Bettany voice output.'}
                </div>
              </div>
            </div>

            <button
              type="button"
              id="btn-audition-voice"
              onClick={() => handleAudition()}
              disabled={isAuditioning}
              className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-md ${
                isAuditioning
                  ? 'bg-amber-500 text-slate-950 animate-pulse'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isAuditioning ? 'TESTING VOICE...' : 'AUDITION VOICE'}</span>
            </button>
          </div>

          {/* Voice Presets List */}
          <div>
            <label className="block text-xs font-mono font-bold tracking-wider text-cyan-300 uppercase mb-3">
              Select Neural Vocal Persona:
            </label>
            <div className="space-y-2.5">
              {VOICE_PRESETS.map((preset) => {
                const isSelected = activeProfile === preset.id;
                return (
                  <div
                    key={preset.id}
                    id={`voice-preset-${preset.id}`}
                    onClick={() => handleSelectProfile(preset.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)] ring-1 ring-cyan-400'
                        : 'bg-slate-950/60 border-cyan-900/40 hover:border-cyan-700/60 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-cyan-100 text-sm">
                            {preset.name}
                          </span>
                          {preset.badge && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-400/20 border border-amber-400/50 text-amber-300">
                              {preset.badge}
                            </span>
                          )}
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-cyan-800/40 text-cyan-400">
                            {preset.accent}
                          </span>
                        </div>
                        <p className="text-xs text-cyan-300/80 leading-relaxed">
                          {preset.description}
                        </p>
                        <div className="text-[10px] font-mono text-cyan-500/80 flex items-center gap-1.5 pt-0.5">
                          <span>Core Model:</span>
                          <span className="text-cyan-400 font-semibold">{preset.neuralModel}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAudition(preset.id);
                          }}
                          title="Preview this voice"
                          className="p-1.5 rounded bg-cyan-950 border border-cyan-800/70 text-cyan-300 hover:bg-cyan-800 hover:text-cyan-100 transition-colors"
                        >
                          <Play className="w-3 h-3 fill-current" />
                        </button>
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                            isSelected
                              ? 'bg-cyan-400 border-cyan-300 text-slate-950 shadow-[0_0_8px_#06b6d4]'
                              : 'border-cyan-800/60'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Holographic Intercom Acoustic Filter */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-xs font-mono font-bold text-cyan-200">
                    HOLOGRAPHIC INTERCOM FILTER & HUD CHIRP
                  </div>
                  <div className="text-[11px] text-cyan-400/70">
                    Plays subtle Stark helmet activation chirp and optimizes vocal clarity
                  </div>
                </div>
              </div>

              <button
                type="button"
                id="btn-toggle-holographic-acoustics"
                onClick={() => handleToggleAcoustics(!holographicAcoustics)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  holographicAcoustics ? 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-slate-950 transition-transform ${
                    holographicAcoustics ? 'translate-x-4.5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cyan-900/50 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] font-mono text-cyan-400/70 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Calibrated to Iron Man Marvel Cinematic Universe standards</span>
          </span>
          <button
            type="button"
            id="btn-save-voice-settings"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            CONFIRM & ENGAGE
          </button>
        </div>
      </div>
    </div>
  );
};
