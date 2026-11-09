import React from 'react';
import { BodyId } from '../types/solar';
import { CELESTIAL_BODIES } from '../data/celestialBodies';
import { Camera, Orbit, Sparkles, Layers, Eye } from 'lucide-react';

interface HeaderNavProps {
  selectedBody: BodyId;
  onSelectBody: (id: BodyId) => void;
  onOpenAR: () => void;
  onCaptureSnapshot: () => void;
  onToggleDetailPanel: () => void;
  isDetailOpen: boolean;
  explodedView: boolean;
  onToggleExplodedView: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  selectedBody,
  onSelectBody,
  onOpenAR,
  onCaptureSnapshot,
  onToggleDetailPanel,
  isDetailOpen,
  explodedView,
  onToggleExplodedView,
}) => {
  const bodies: { id: BodyId; label: string; icon: string }[] = [
    { id: 'all', label: 'Sistema', icon: '🌌' },
    { id: 'sun', label: 'Sol', icon: '☀️' },
    { id: 'mercury', label: 'Mercúrio', icon: '⚪' },
    { id: 'venus', label: 'Vênus', icon: '🟡' },
    { id: 'earth', label: 'Terra', icon: '🌍' },
    { id: 'moon', label: 'Lua', icon: '🌑' },
  ];

  return (
    <header className="absolute top-0 left-0 right-0 z-30 pointer-events-none p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3">
      {/* Brand & Title */}
      <div className="pointer-events-auto flex items-center gap-3 bg-neutral-900/90 border border-neutral-700/80 rounded-xl px-4 py-2.5 shadow-xl">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-300 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
          <Orbit className="w-5 h-5 text-neutral-950 animate-spin-slow" />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-wide text-neutral-100 flex items-center gap-1.5">
            SISTEMA SOLAR INTERIOR
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              3D & AR
            </span>
          </h1>
          <p className="text-[11px] text-neutral-400">Órbitas Internas: Sol a Terra e Lua</p>
        </div>
      </div>

      {/* Center Body Selection Pills */}
      <nav className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 bg-neutral-900/90 border border-neutral-700/80 rounded-xl p-1 shadow-xl overflow-x-auto max-w-full">
        {bodies.map((b) => {
          const isActive = selectedBody === b.id;
          return (
            <button
              key={b.id}
              onClick={() => onSelectBody(b.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-neutral-950 font-semibold shadow-md shadow-amber-500/25'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <span className="text-sm leading-none">{b.icon}</span>
              <span>{b.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right Action Tools: AR, Structure Slice, Snapshot, Details */}
      <div className="pointer-events-auto flex items-center gap-2">
        {/* Exploded / Internal Layers Toggle */}
        {selectedBody !== 'all' && (
          <button
            onClick={onToggleExplodedView}
            title="Corte Estrutural 3D (Ver Camadas Internas)"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer shadow-lg ${
              explodedView
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-indigo-600/30'
                : 'bg-neutral-900/90 border-neutral-700 text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Camadas 3D</span>
          </button>
        )}

        {/* Augmented Reality Button */}
        <button
          onClick={onOpenAR}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 shadow-lg shadow-amber-500/20 border border-amber-300/40 cursor-pointer transition-all active:scale-95"
        >
          <Sparkles className="w-4 h-4 fill-neutral-950" />
          <span>Realidade Aumentada (AR)</span>
        </button>

        {/* Snapshot Tool */}
        <button
          onClick={onCaptureSnapshot}
          title="Capturar Foto 3D"
          className="p-2 rounded-xl bg-neutral-900/90 border border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800 shadow-lg cursor-pointer transition-all active:scale-95"
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Detail Panel Toggle */}
        {selectedBody !== 'all' && (
          <button
            onClick={onToggleDetailPanel}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border cursor-pointer transition-all shadow-lg ${
              isDetailOpen
                ? 'bg-neutral-800 border-amber-500/50 text-amber-400'
                : 'bg-neutral-900/90 border-neutral-700 text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Telemetria</span>
          </button>
        )}
      </div>
    </header>
  );
};
