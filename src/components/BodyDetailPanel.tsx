import React, { useState } from 'react';
import { CelestialBodyData, PlanetaryLayer } from '../types/solar';
import { X, Layers, Compass, Wind, Rocket, Sparkles, AlertCircle, ChevronRight } from 'lucide-react';

interface BodyDetailPanelProps {
  body: CelestialBodyData;
  onClose: () => void;
  explodedView: boolean;
  onToggleExplodedView: () => void;
  onLaunchAR: () => void;
}

export const BodyDetailPanel: React.FC<BodyDetailPanelProps> = ({
  body,
  onClose,
  explodedView,
  onToggleExplodedView,
  onLaunchAR,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'layers' | 'atmosphere' | 'facts' | 'missions'>('overview');

  return (
    <div className="fixed top-18 right-3 sm:right-6 bottom-20 z-20 w-[92vw] sm:w-[440px] max-w-[480px] bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-neutral-200">
      {/* Header Banner */}
      <div
        className="p-4 border-b border-neutral-800 relative"
        style={{
          background: `linear-gradient(135deg, rgba(20,24,33,0.95), ${body.color}15)`,
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: body.color, boxShadow: `0 0 10px ${body.color}` }}
          />
          <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
            {body.category} • {body.latinName}
          </span>
        </div>

        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center justify-between">
          <span>{body.name}</span>
          <button
            onClick={onLaunchAR}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-all cursor-pointer shadow-md shadow-amber-500/20 mr-7 sm:mr-8"
          >
            <Sparkles className="w-3.5 h-3.5 fill-neutral-950" />
            <span>Ver em AR</span>
          </button>
        </h2>

        <p className="text-xs text-neutral-300 mt-1 line-clamp-2">{body.summary}</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-neutral-800 bg-neutral-950/60 p-1 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
            activeTab === 'overview' ? 'bg-neutral-800 text-amber-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Visão Geral
        </button>
        <button
          onClick={() => setActiveTab('layers')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
            activeTab === 'layers' ? 'bg-neutral-800 text-amber-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Layers className="w-3 h-3" />
          <span>Estrutura</span>
        </button>
        <button
          onClick={() => setActiveTab('atmosphere')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
            activeTab === 'atmosphere' ? 'bg-neutral-800 text-amber-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Wind className="w-3 h-3" />
          <span>Atmosfera</span>
        </button>
        <button
          onClick={() => setActiveTab('facts')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
            activeTab === 'facts' ? 'bg-neutral-800 text-amber-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Curiosidades
        </button>
        <button
          onClick={() => setActiveTab('missions')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
            activeTab === 'missions' ? 'bg-neutral-800 text-amber-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Rocket className="w-3 h-3" />
          <span>Missões</span>
        </button>
      </div>

      {/* Tab Content Body (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <p className="text-neutral-300 leading-relaxed bg-neutral-950/40 p-3 rounded-xl border border-neutral-800">
              {body.narrativeDescription}
            </p>

            {/* Telemetry Metric Cards Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-800">
                <span className="text-[10px] uppercase text-neutral-400 font-mono">Raio Médio</span>
                <p className="text-sm font-semibold text-neutral-100 mt-0.5">
                  {body.radiusKm.toLocaleString('pt-BR')} km
                </p>
              </div>

              <div className="bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-800">
                <span className="text-[10px] uppercase text-neutral-400 font-mono">Massa</span>
                <p className="text-xs font-semibold text-neutral-100 mt-0.5">{body.massKg}</p>
              </div>

              <div className="bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-800">
                <span className="text-[10px] uppercase text-neutral-400 font-mono">Gravidade Superficial</span>
                <p className="text-xs font-semibold text-neutral-100 mt-0.5">{body.surfaceGravity}</p>
              </div>

              <div className="bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-800">
                <span className="text-[10px] uppercase text-neutral-400 font-mono">Velocidade de Escape</span>
                <p className="text-xs font-semibold text-neutral-100 mt-0.5">{body.escapeVelocityKmS}</p>
              </div>

              <div className="bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-800">
                <span className="text-[10px] uppercase text-neutral-400 font-mono">Período Orbital</span>
                <p className="text-xs font-semibold text-neutral-100 mt-0.5">
                  {body.orbitPeriodDays > 0 ? `${body.orbitPeriodDays} dias` : 'Centro Gravitacional'}
                </p>
              </div>

              <div className="bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-800">
                <span className="text-[10px] uppercase text-neutral-400 font-mono">Rotação Axial</span>
                <p className="text-xs font-semibold text-neutral-100 mt-0.5">
                  {body.rotationPeriodHours > 0
                    ? `${body.rotationPeriodHours}h`
                    : `${Math.abs(body.rotationPeriodHours)}h (Retrógrada)`}
                </p>
              </div>
            </div>

            {/* Temperature card */}
            <div className="bg-neutral-950/80 p-3 rounded-xl border border-neutral-800">
              <span className="text-[10px] uppercase text-neutral-400 font-mono">Faixa Térmica & Média</span>
              <p className="text-sm font-semibold text-amber-300 mt-0.5">{body.temperatureRange}</p>
            </div>
          </div>
        )}

        {/* Tab 2: Internal Structure & Layers */}
        {activeTab === 'layers' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-indigo-950/40 border border-indigo-700/50 p-3 rounded-xl">
              <div>
                <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Corte Transversal 3D
                </h4>
                <p className="text-[11px] text-neutral-400">Ver camadas geológicas abertas no modelo 3D</p>
              </div>
              <button
                onClick={onToggleExplodedView}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  explodedView
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-indigo-300 border border-indigo-500/30'
                }`}
              >
                {explodedView ? 'Ocultar Corte' : 'Ativar 3D'}
              </button>
            </div>

            <div className="space-y-2.5">
              {body.layers.map((layer, idx) => (
                <div
                  key={idx}
                  className="bg-neutral-950/70 border border-neutral-800 p-3 rounded-xl hover:border-neutral-700 transition-all"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="font-semibold text-neutral-200">{layer.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                      {layer.temperature}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 mb-1">
                    <span className="text-neutral-500 font-mono">Profundidade: </span>
                    {layer.depth}
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed">{layer.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Atmosphere & Climate */}
        {activeTab === 'atmosphere' && (
          <div className="space-y-4">
            <div className="bg-neutral-950/80 p-3 rounded-xl border border-neutral-800">
              <span className="text-[10px] uppercase text-neutral-400 font-mono">Pressão na Superfície</span>
              <p className="text-xs font-semibold text-neutral-100 mt-1">{body.atmosphericPressure}</p>
            </div>

            <div className="bg-neutral-950/80 p-3 rounded-xl border border-neutral-800 space-y-3">
              <h4 className="text-xs font-semibold text-neutral-200">Composição Elementar / Molecular</h4>
              <div className="space-y-2">
                {body.atmosphereComposition.map((comp, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-300">{comp.name}</span>
                      <span className="font-mono text-amber-300 font-semibold">{comp.percentage}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(2, comp.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Fascinating Facts */}
        {activeTab === 'facts' && (
          <div className="space-y-2.5">
            {body.fascinatingFacts.map((fact, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 bg-neutral-950/70 border border-neutral-800 p-3 rounded-xl"
              >
                <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-mono text-[10px] font-bold mt-0.5">
                  {idx + 1}
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed">{fact}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tab 5: Space Exploration Missions */}
        {activeTab === 'missions' && (
          <div className="space-y-3">
            {body.missions.map((mission, idx) => (
              <div
                key={idx}
                className="bg-neutral-950/80 border border-neutral-800 p-3 rounded-xl space-y-1"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-neutral-100">{mission.name}</h4>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                    {mission.year}
                  </span>
                </div>
                <span className="text-[10px] text-neutral-400 block">{mission.agency}</span>
                <p className="text-[11px] text-neutral-300 leading-relaxed pt-1">{mission.achievement}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Tags */}
      <div className="p-3 border-t border-neutral-800 bg-neutral-950/80 flex flex-wrap gap-1.5">
        {body.tags.map((t, i) => (
          <span
            key={i}
            className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400 border border-neutral-700/60"
          >
            #{t}
          </span>
        ))}
      </div>
    </div>
  );
};
