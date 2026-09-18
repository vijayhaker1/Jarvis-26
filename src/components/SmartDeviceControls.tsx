import React from 'react';
import { 
  Lightbulb, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  ShieldAlert, 
  Zap, 
  Thermometer, 
  Sliders, 
  Wind,
  Radio
} from 'lucide-react';
import { SmartDeviceState } from '../types';

interface SmartDeviceControlsProps {
  deviceState: SmartDeviceState;
  onUpdateState: (partial: Partial<SmartDeviceState>) => void;
}

const COLOR_PRESETS = [
  { name: 'Cyan Classic', hex: '#00f0ff', mode: 'normal' },
  { name: 'Deep Focus', hex: '#0066ff', mode: 'focus' },
  { name: 'Combat Red', hex: '#ff1744', mode: 'combat' },
  { name: 'Amber Glow', hex: '#ff9100', mode: 'normal' },
  { name: 'Stealth Emerald', hex: '#00e676', mode: 'stealth' },
];

export const SmartDeviceControls: React.FC<SmartDeviceControlsProps> = ({
  deviceState,
  onUpdateState,
}) => {
  const { lighting, security, climate, powerGrid } = deviceState;

  const handleLightToggle = () => {
    onUpdateState({
      lighting: {
        ...lighting,
        power: !lighting.power,
      },
    });
  };

  const handleBrightnessChange = (val: number) => {
    onUpdateState({
      lighting: {
        ...lighting,
        brightness: val,
      },
    });
  };

  const handleColorSelect = (hex: string, mode: any) => {
    onUpdateState({
      lighting: {
        ...lighting,
        color: hex,
        mode,
        power: true,
      },
    });
  };

  const handleToggleBlastDoors = () => {
    const nextLocked = !security.blastDoorsLocked;
    onUpdateState({
      security: {
        ...security,
        blastDoorsLocked: nextLocked,
        securityLevel: nextLocked ? 'DEFCON 3' : 'DEFCON 5',
      },
    });
  };

  const handleToggleShield = () => {
    onUpdateState({
      security: {
        ...security,
        perimeterShield: !security.perimeterShield,
      },
    });
  };

  const handleReactorOutput = (output: number) => {
    onUpdateState({
      powerGrid: {
        ...powerGrid,
        reactorOutput: output,
        gridLoad: Math.round(output * 4.6),
      },
    });
  };

  const handleTempAdjust = (delta: number) => {
    onUpdateState({
      climate: {
        ...climate,
        temperature: Math.round((climate.temperature + delta) * 10) / 10,
      },
    });
  };

  return (
    <div className="w-full bg-slate-950/70 border border-cyan-900/60 rounded-xl p-4 flex flex-col gap-4 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-cyan-900/50 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h2 className="font-display text-sm font-bold tracking-wider text-cyan-100 uppercase">
            FACILITY ENVIRONMENT & HARDWARE
          </h2>
        </div>
        <span className="text-[10px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800">
          AUTOMATION CONTROL
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Laboratory Illumination */}
        <div className="bg-slate-900/60 border border-cyan-900/50 rounded-lg p-3.5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span className="font-display text-xs font-bold text-cyan-200 uppercase">LIGHTING</span>
            </div>
            <button
              id="btn-toggle-lights"
              onClick={handleLightToggle}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-all ${
                lighting.power
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {lighting.power ? 'ACTIVE' : 'MUTED'}
            </button>
          </div>

          {/* Brightness slider */}
          <div className="flex flex-col gap-1 text-xs font-mono">
            <div className="flex justify-between text-[11px] text-cyan-400/80">
              <span>BRIGHTNESS</span>
              <span>{lighting.power ? `${lighting.brightness}%` : '0%'}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={lighting.power ? lighting.brightness : 0}
              onChange={(e) => handleBrightnessChange(parseInt(e.target.value, 10))}
              disabled={!lighting.power}
              className="w-full accent-cyan-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          {/* Color Palettes */}
          <div className="flex items-center gap-1.5 pt-1">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.hex}
                type="button"
                onClick={() => handleColorSelect(preset.hex, preset.mode)}
                title={preset.name}
                className={`w-5 h-5 rounded-full border transition-all ${
                  lighting.color === preset.hex
                    ? 'scale-110 border-white ring-2 ring-cyan-400'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: preset.hex }}
              />
            ))}
          </div>
        </div>

        {/* 2. Facility Security & Blast Doors */}
        <div className="bg-slate-900/60 border border-cyan-900/50 rounded-lg p-3.5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              <span className="font-display text-xs font-bold text-cyan-200 uppercase">SECURITY</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950/60 border border-rose-800 text-rose-300">
              {security.securityLevel}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <button
              id="btn-toggle-blast-doors"
              type="button"
              onClick={handleToggleBlastDoors}
              className={`w-full py-1.5 px-3 rounded flex items-center justify-between text-xs font-mono font-semibold border transition-all ${
                security.blastDoorsLocked
                  ? 'bg-rose-950/40 border-rose-700/60 text-rose-200'
                  : 'bg-slate-800/40 border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {security.blastDoorsLocked ? <Lock className="w-3.5 h-3.5 text-rose-400" /> : <Unlock className="w-3.5 h-3.5 text-slate-400" />}
                <span>BLAST DOORS</span>
              </div>
              <span>{security.blastDoorsLocked ? 'LOCKED' : 'OPEN'}</span>
            </button>

            <button
              id="btn-toggle-shields"
              type="button"
              onClick={handleToggleShield}
              className={`w-full py-1.5 px-3 rounded flex items-center justify-between text-xs font-mono font-semibold border transition-all ${
                security.perimeterShield
                  ? 'bg-cyan-950/40 border-cyan-700/60 text-cyan-200'
                  : 'bg-slate-800/40 border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span>PERIMETER SHIELD</span>
              </div>
              <span>{security.perimeterShield ? '100% ARMED' : 'OFFLINE'}</span>
            </button>
          </div>
        </div>

        {/* 3. Power Grid & Arc Output */}
        <div className="bg-slate-900/60 border border-cyan-900/50 rounded-lg p-3.5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className="font-display text-xs font-bold text-cyan-200 uppercase">POWER GRID</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-300">
              {powerGrid.gridLoad} MW
            </span>
          </div>

          <div className="flex flex-col gap-1 text-xs font-mono">
            <div className="flex justify-between text-[11px] text-cyan-400/80">
              <span>REACTOR OUTPUT</span>
              <span className="font-bold text-cyan-200">{powerGrid.reactorOutput}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="120"
              value={powerGrid.reactorOutput}
              onChange={(e) => handleReactorOutput(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          <div className="flex justify-between text-[11px] font-mono text-cyan-400/70 border-t border-cyan-950 pt-2">
            <span>AUX BATTERY:</span>
            <span className="text-emerald-400 font-bold">{powerGrid.auxiliaryBattery}% Nominal</span>
          </div>
        </div>

        {/* 4. Atmospheric & Climate */}
        <div className="bg-slate-900/60 border border-cyan-900/50 rounded-lg p-3.5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-sky-400" />
              <span className="font-display text-xs font-bold text-cyan-200 uppercase">CLIMATE</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-300">
              <Wind className="w-3 h-3 text-emerald-400 animate-spin" />
              <span>VENT ACTIVE</span>
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="text-xl font-mono font-bold text-cyan-100">
              {climate.temperature.toFixed(1)}°C
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleTempAdjust(-0.5)}
                className="w-7 h-7 rounded bg-slate-950 border border-cyan-800 text-cyan-300 hover:border-cyan-500 flex items-center justify-center font-bold text-sm"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => handleTempAdjust(0.5)}
                className="w-7 h-7 rounded bg-slate-950 border border-cyan-800 text-cyan-300 hover:border-cyan-500 flex items-center justify-center font-bold text-sm"
              >
                +
              </button>
            </div>
          </div>

          <div className="text-[10px] font-mono text-cyan-400/60 border-t border-cyan-950 pt-2 flex justify-between">
            <span>STABILITY:</span>
            <span className="text-emerald-400">101.3 kPa (Nominal)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
