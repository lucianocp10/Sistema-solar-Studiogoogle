/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SolarSystemScene } from './three/SolarSystemScene';
import { BodyId } from './types/solar';
import { CELESTIAL_BODIES } from './data/celestialBodies';
import { HeaderNav } from './components/HeaderNav';
import { BottomDock } from './components/BottomDock';
import { BodyDetailPanel } from './components/BodyDetailPanel';
import { ARViewModal } from './components/ARViewModal';
import { Check, Sparkles, AlertCircle } from 'lucide-react';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneInstanceRef = useRef<SolarSystemScene | null>(null);

  // Application State
  const [selectedBody, setSelectedBody] = useState<BodyId>('all');
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1.0);
  const [showOrbits, setShowOrbits] = useState<boolean>(true);
  const [explodedView, setExplodedView] = useState<boolean>(false);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isAROpen, setIsAROpen] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(60);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize Three.js WebGL Scene once on mount
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const scene = new SolarSystemScene(canvasMountRef.current, {
      onSelectBody: (id: BodyId) => {
        setSelectedBody(id);
        if (id !== 'all') {
          setIsDetailOpen(true);
        }
      },
      onFpsUpdate: (currentFps: number) => {
        setFps(currentFps);
      },
    });

    sceneInstanceRef.current = scene;

    return () => {
      scene.dispose();
      sceneInstanceRef.current = null;
    };
  }, []);

  // Keyboard shortcuts (H for cinema mode / dock toggle, Space for play/pause, Esc to close panels)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 'Escape') {
        if (isAROpen) setIsAROpen(false);
        else if (isDetailOpen) setIsDetailOpen(false);
      } else if (e.key === '1') {
        handleSelectBody('sun');
      } else if (e.key === '2') {
        handleSelectBody('mercury');
      } else if (e.key === '3') {
        handleSelectBody('venus');
      } else if (e.key === '4') {
        handleSelectBody('earth');
      } else if (e.key === '5') {
        handleSelectBody('moon');
      } else if (e.key === '0' || e.key.toLowerCase() === 's') {
        handleSelectBody('all');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAROpen, isDetailOpen, isRunning]);

  // Handler: Select Celestial Body
  const handleSelectBody = (id: BodyId) => {
    setSelectedBody(id);
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.selectBody(id);
    }
    if (id !== 'all') {
      setIsDetailOpen(true);
    } else {
      setIsDetailOpen(false);
      setExplodedView(false);
      if (sceneInstanceRef.current) {
        sceneInstanceRef.current.setExplodedView(false);
      }
    }
  };

  // Handler: Play / Pause Simulation
  const handleTogglePlay = () => {
    if (sceneInstanceRef.current) {
      const running = sceneInstanceRef.current.togglePlayPause();
      setIsRunning(running);
    }
  };

  // Handler: Set Speed Multiplier
  const handleSetSpeed = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.setSpeed(newSpeed);
    }
  };

  // Handler: Toggle Orbit Lines
  const handleToggleOrbits = () => {
    if (sceneInstanceRef.current) {
      const orbitsVisible = sceneInstanceRef.current.toggleOrbits();
      setShowOrbits(orbitsVisible);
    }
  };

  // Handler: Toggle Exploded Structure Layers
  const handleToggleExplodedView = () => {
    const nextVal = !explodedView;
    setExplodedView(nextVal);
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.setExplodedView(nextVal);
    }
    showToast(nextVal ? 'Corte Estrutural 3D Ativado' : 'Corte 3D Fechado');
  };

  // Handler: Reset Camera View
  const handleResetView = () => {
    handleSelectBody('all');
    showToast('Visão Geral Redefinida');
  };

  // Handler: Capture High-Res Canvas Snapshot
  const handleCaptureSnapshot = () => {
    if (!sceneInstanceRef.current) return;
    const dataUrl = sceneInstanceRef.current.captureSnapshot();
    const link = document.createElement('a');
    link.download = `Sistema_Solar_${selectedBody}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    showToast('Foto do Sistema Solar capturada!');
  };

  // Helper toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 select-none">
      {/* 3D WebGL Canvas Mount Container (isolated from HUD re-renders) */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-0"
      />

      {/* Top Header Navigation Overlay */}
      <HeaderNav
        selectedBody={selectedBody}
        onSelectBody={handleSelectBody}
        onOpenAR={() => setIsAROpen(true)}
        onCaptureSnapshot={handleCaptureSnapshot}
        onToggleDetailPanel={() => setIsDetailOpen(!isDetailOpen)}
        isDetailOpen={isDetailOpen}
        explodedView={explodedView}
        onToggleExplodedView={handleToggleExplodedView}
      />

      {/* Collapsible Unified Bottom Control Dock */}
      <BottomDock
        isRunning={isRunning}
        onTogglePlay={handleTogglePlay}
        speed={speed}
        onSetSpeed={handleSetSpeed}
        showOrbits={showOrbits}
        onToggleOrbits={handleToggleOrbits}
        explodedView={explodedView}
        onToggleExplodedView={handleToggleExplodedView}
        onResetView={handleResetView}
        selectedBody={selectedBody}
        fps={fps}
      />

      {/* Detailed Telemetry & Astronomical Info Panel */}
      {isDetailOpen && selectedBody !== 'all' && (
        <BodyDetailPanel
          body={CELESTIAL_BODIES[selectedBody]}
          onClose={() => setIsDetailOpen(false)}
          explodedView={explodedView}
          onToggleExplodedView={handleToggleExplodedView}
          onLaunchAR={() => setIsAROpen(true)}
        />
      )}

      {/* Augmented Reality (AR) Suite Modal */}
      {isAROpen && (
        <ARViewModal
          initialBodyId={selectedBody}
          onClose={() => setIsAROpen(false)}
        />
      )}

      {/* Feedback Toast Banner */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-neutral-900 border border-neutral-700 text-neutral-100 text-xs px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 animate-fade-in pointer-events-none">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
