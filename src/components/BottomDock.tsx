import React, { useState } from 'react';
import { Play, Pause, FastForward, RotateCcw, ChevronDown, ChevronUp, Compass, Layers, Info } from 'lucide-react';
import { BodyId } from '../types/solar';

interface BottomDockProps {
  isRunning: boolean;
  onTogglePlay: () => void;
  speed: number;
  onSetSpeed: (speed: number) => void;
  showOrbits: boolean;
  onToggleOrbits: () => void;
  explodedView: boolean;
  onToggleExplodedView: () => void;
  onResetView: () => void;
  selectedBody: BodyId;
  fps?: number;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  isRunning,
  onTogglePlay,
  speed,
  onSetSpeed,
  showOrbits,
  onToggleOrbits,
  explodedView,
  onToggleExplodedView,
  onResetView,
  selectedBody,
  fps,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const speedOptions = [0.2, 1, 5, 20, 50];

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-30 transition-transform duration-300 ease-out flex flex-col items-center pointer-events-none w-full max-w-[min(920px,94vw)] ${
        collapsed ? 'translate-y-[calc(100%-38px)]' : 'translate-y-0'
      }`}
    >
      {/* Collapse/Expand Toggle Tab */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="pointer-events-auto flex items-center gap-1.5 px-4 py-1.5 rounded-t-xl bg-neutral-900 border-t border-x border-neutral-700/80 text-[11px] font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer shadow-lg shadow-black/40"
      >
        {collapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
            <span>Exibir Controles Orbitais (H)</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            <span>Modo Cinema / Ocultar (H)</span>
          </>
        )}
      </button>

      {/* Main Solid Dock Surface */}
      <div className="pointer-events-auto w-full bg-neutral-900 border border-neutral-700/80 rounded-2xl p-2.5 sm:p-3 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-neutral-200">
        {/* Play/Pause & Speed Multipliers */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onTogglePlay}
            title={isRunning ? 'Pausar Simulação' : 'Continuar Órbitas'}
            className={`p-2 sm:px-3 sm:py-2 rounded-xl flex items-center gap-2 text-xs font-semibold cursor-pointer transition-all ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/20'
                : 'bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-amber-500/40'
            }`}
          >
            {isRunning ? <Pause className="w-4 h-4 fill-neutral-950" /> : <Play className="w-4 h-4 fill-amber-400" />}
            <span className="hidden sm:inline">{isRunning ? 'Pausar' : 'Iniciar'}</span>
          </button>

          {/* Speed Pills */}
          <div className="flex items-center gap-1 bg-neutral-950/80 rounded-xl p-1 border border-neutral-800">
            <span className="text-[10px] text-neutral-400 px-1.5 font-mono hidden sm:inline">VEL:</span>
            {speedOptions.map((s) => (
              <button
                key={s}
                onClick={() => onSetSpeed(s)}
                className={`px-2 py-1 rounded-lg text-[11px] font-mono font-medium transition-all cursor-pointer ${
                  speed === s
                    ? 'bg-neutral-700 text-amber-300 font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Middle: Orbits & Internal Layers */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onToggleOrbits}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border cursor-pointer transition-all ${
              showOrbits
                ? 'bg-neutral-800 border-neutral-600 text-neutral-100'
                : 'bg-neutral-950/80 border-neutral-800 text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Compass className={`w-3.5 h-3.5 ${showOrbits ? 'text-amber-400' : 'text-neutral-500'}`} />
            <span className="hidden md:inline">Órbitas</span>
          </button>

          {selectedBody !== 'all' && (
            <button
              onClick={onToggleExplodedView}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border cursor-pointer transition-all ${
                explodedView
                  ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                  : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className={`w-3.5 h-3.5 ${explodedView ? 'text-indigo-400' : 'text-neutral-500'}`} />
              <span className="hidden md:inline">Estrutura Interna</span>
            </button>
          )}

          <button
            onClick={onResetView}
            title="Redefinir Posição da Câmera"
            className="p-2 rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Info & Interaction Tips (Static indicator, no pulsating dot) */}
        <div className="flex items-center gap-3 text-[11px] text-neutral-400">
          <div className="hidden lg:flex items-center gap-1.5 bg-neutral-950/60 px-2.5 py-1 rounded-lg border border-neutral-800/80">
            <span className="text-neutral-500">Girar:</span>
            <span className="text-neutral-300 font-medium">Arrastar</span>
            <span className="text-neutral-600">|</span>
            <span className="text-neutral-500">Zoom:</span>
            <span className="text-neutral-300 font-medium">Scroll / Pinça</span>
          </div>

          {fps !== undefined && (
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-neutral-400 bg-neutral-950/80 px-2 py-1 rounded-md border border-neutral-800">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <span>{fps} FPS</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
