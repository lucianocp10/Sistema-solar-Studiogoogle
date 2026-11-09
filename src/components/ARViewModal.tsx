import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BodyId } from '../types/solar';
import { CELESTIAL_BODIES } from '../data/celestialBodies';
import {
  createSunTexture,
  createMercuryTexture,
  createVenusCloudTexture,
  createVenusSurfaceTexture,
  createEarthTexture,
  createEarthCloudTexture,
  createMoonTexture,
} from '../utils/proceduralTextures';
import {
  X,
  Camera,
  Layers,
  Sparkles,
  Maximize2,
  RefreshCw,
  Compass,
  AlertCircle,
  HelpCircle,
  Smartphone,
  Eye,
} from 'lucide-react';

interface ARViewModalProps {
  initialBodyId: BodyId;
  onClose: () => void;
}

export const ARViewModal: React.FC<ARViewModalProps> = ({ initialBodyId, onClose }) => {
  const [selectedBodyId, setSelectedBodyId] = useState<BodyId>(
    initialBodyId === 'all' ? 'earth' : initialBodyId
  );
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [webxrSupported, setWebxrSupported] = useState<boolean>(false);
  const [scaleMode, setScaleMode] = useState<'desk' | 'room' | 'giant'>('desk');
  const [showInternalLayers, setShowInternalLayers] = useState<boolean>(false);
  const [gyroActive, setGyroActive] = useState<boolean>(false);
  const [snapshotTaken, setSnapshotTaken] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const currentModelGroupRef = useRef<THREE.Group | null>(null);
  const internalLayersGroupRef = useRef<THREE.Group | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const bodyData = CELESTIAL_BODIES[selectedBodyId] || CELESTIAL_BODIES['earth'];

  // Check WebXR AR support
  useEffect(() => {
    if ('xr' in navigator && (navigator as any).xr?.isSessionSupported) {
      (navigator as any).xr.isSessionSupported('immersive-ar').then((supported: boolean) => {
        setWebxrSupported(supported);
      }).catch(() => setWebxrSupported(false));
    }
  }, []);

  // Initialize Camera Stream
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        setCameraError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraActive(true);
        }
      } catch (err: any) {
        console.warn('Camera AR fallback active without hardware stream:', err);
        setCameraError('Permissão de câmera não concedida. Modo AR interativo ativo com fundo de estúdio translúcido.');
        setCameraActive(false);
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Gyroscope DeviceOrientation listener
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!gyroActive || !currentModelGroupRef.current) return;
      if (e.beta !== null && e.gamma !== null) {
        const x = THREE.MathUtils.degToRad(e.beta - 45) * 0.5;
        const y = THREE.MathUtils.degToRad(e.gamma) * 0.5;
        currentModelGroupRef.current.rotation.x = x;
        currentModelGroupRef.current.rotation.y += 0.005;
      }
    };

    if (gyroActive) {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [gyroActive]);

  // Request Gyroscope permission for iOS Safari if needed
  const toggleGyroscope = async () => {
    if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          setGyroActive(!gyroActive);
        }
      } catch {
        setGyroActive(!gyroActive);
      }
    } else {
      setGyroActive(!gyroActive);
    }
  };

  // Build Dedicated AR Three.js Scene
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const mount = canvasMountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 3.8);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.2;
    controls.maxDistance = 10;
    controlsRef.current = controls;

    // Room Environment for realistic PBR metallic/roughness reflection
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch {
      // safe fallback
    }

    // Directional sunlight Key + Hemisphere fill
    const dirLight = new THREE.DirectionalLight(0xFFF9E6, 3.2);
    dirLight.position.set(3, 4, 3);
    scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0xE0F7FA, 0x212121, 1.0);
    scene.add(hemiLight);

    // Build the specific 3D model for the selected celestial body
    buildARModel(scene, renderer, selectedBodyId);

    // Animation Loop
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (currentModelGroupRef.current && !gyroActive) {
        currentModelGroupRef.current.rotation.y += 0.006;
      }
      if (cloudsMeshRef.current) {
        cloudsMeshRef.current.rotation.y += 0.009;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, [selectedBodyId]);

  // Adjust model scale according to AR scale preset
  useEffect(() => {
    if (!currentModelGroupRef.current) return;
    const baseScale = scaleMode === 'desk' ? 0.75 : scaleMode === 'room' ? 1.4 : 2.2;
    currentModelGroupRef.current.scale.set(baseScale, baseScale, baseScale);
  }, [scaleMode]);

  // Toggle internal layers visibility
  useEffect(() => {
    if (internalLayersGroupRef.current) {
      internalLayersGroupRef.current.visible = showInternalLayers;
    }
  }, [showInternalLayers]);

  // Build composite procedural 3D model specifically for AR inspection
  const buildARModel = (scene: THREE.Scene, renderer: THREE.WebGLRenderer, bodyId: BodyId) => {
    // Remove previous model
    if (currentModelGroupRef.current) {
      scene.remove(currentModelGroupRef.current);
    }

    const group = new THREE.Group();
    currentModelGroupRef.current = group;

    const layersGroup = new THREE.Group();
    internalLayersGroupRef.current = layersGroup;
    layersGroup.visible = showInternalLayers;

    // Soft radial ground contact shadow underneath model for AR grounding
    const shadowGeo = new THREE.PlaneGeometry(2.4, 2.4);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const shadowGrad = sCtx.createRadialGradient(64, 64, 5, 64, 64, 60);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    shadowGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = shadowGrad;
    sCtx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -1.15;
    group.add(shadowMesh);

    // Build specific planet geometry
    if (bodyId === 'sun') {
      const sunTex = createSunTexture(renderer);
      const sunGeo = new THREE.SphereGeometry(1.0, 48, 36);
      const sunMat = new THREE.MeshBasicMaterial({ map: sunTex });
      const sunMesh = new THREE.Mesh(sunGeo, sunMat);
      group.add(sunMesh);

      const glowGeo = new THREE.SphereGeometry(1.1, 32, 24);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xFFA000,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      });
      group.add(new THREE.Mesh(glowGeo, glowMat));

      // Internal layers
      buildLayersMesh(layersGroup, 1.0, [
        { name: 'Núcleo', color: 0xFFFFFF, r: 0.3 },
        { name: 'Zona Radiativa', color: 0xFFA000, r: 0.65 },
        { name: 'Zona Convectiva', color: 0xE65100, r: 0.95 },
      ]);
    } else if (bodyId === 'mercury') {
      const mercTex = createMercuryTexture(renderer);
      const mercGeo = new THREE.SphereGeometry(0.85, 48, 36);
      const mercMat = new THREE.MeshStandardMaterial({ map: mercTex, roughness: 0.9, metalness: 0.1 });
      group.add(new THREE.Mesh(mercGeo, mercMat));

      buildLayersMesh(layersGroup, 0.85, [
        { name: 'Núcleo de Ferro (85%)', color: 0xCFD8DC, r: 0.82 },
        { name: 'Manto & Crosta', color: 0x8D6E63, r: 1.0 },
      ]);
    } else if (bodyId === 'venus') {
      const venusTex = createVenusCloudTexture(renderer);
      const venusGeo = new THREE.SphereGeometry(0.95, 48, 36);
      const venusMat = new THREE.MeshStandardMaterial({ map: venusTex, roughness: 0.6, metalness: 0.05 });
      group.add(new THREE.Mesh(venusGeo, venusMat));

      buildLayersMesh(layersGroup, 0.95, [
        { name: 'Núcleo', color: 0xFFE082, r: 0.5 },
        { name: 'Manto', color: 0xD84315, r: 0.92 },
        { name: 'Crosta Basáltica', color: 0xBF360C, r: 1.0 },
      ]);
    } else if (bodyId === 'earth') {
      // Earth continents & oceans
      const earthTex = createEarthTexture(renderer);
      const earthGeo = new THREE.SphereGeometry(0.95, 48, 36);
      const earthMat = new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.6, metalness: 0.15 });
      group.add(new THREE.Mesh(earthGeo, earthMat));

      // Clouds
      const cloudTex = createEarthCloudTexture(renderer);
      const cloudGeo = new THREE.SphereGeometry(0.97, 36, 28);
      const cloudMat = new THREE.MeshStandardMaterial({
        map: cloudTex,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      });
      const clouds = new THREE.Mesh(cloudGeo, cloudMat);
      cloudsMeshRef.current = clouds;
      group.add(clouds);

      // Atmosphere glow
      const glowGeo = new THREE.SphereGeometry(1.02, 32, 24);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x64B5F6,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      });
      group.add(new THREE.Mesh(glowGeo, glowMat));

      buildLayersMesh(layersGroup, 0.95, [
        { name: 'Núcleo Interno', color: 0xFFF9C4, r: 0.28 },
        { name: 'Núcleo Externo', color: 0xFFB74D, r: 0.58 },
        { name: 'Manto', color: 0xE65100, r: 0.93 },
        { name: 'Crosta', color: 0x1E88E5, r: 1.0 },
      ]);
    } else if (bodyId === 'moon') {
      const moonTex = createMoonTexture(renderer);
      const moonGeo = new THREE.SphereGeometry(0.8, 48, 36);
      const moonMat = new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.92, metalness: 0.08 });
      group.add(new THREE.Mesh(moonGeo, moonMat));

      buildLayersMesh(layersGroup, 0.8, [
        { name: 'Núcleo de Ferro', color: 0xCFD8DC, r: 0.25 },
        { name: 'Manto & Crosta', color: 0x78909C, r: 1.0 },
      ]);
    }

    group.add(layersGroup);

    // Initial scale application
    const baseScale = scaleMode === 'desk' ? 0.75 : scaleMode === 'room' ? 1.4 : 2.2;
    group.scale.set(baseScale, baseScale, baseScale);

    scene.add(group);
  };

  const buildLayersMesh = (group: THREE.Group, baseRadius: number, layers: { name: string; color: number; r: number }[]) => {
    layers.forEach((layer) => {
      const lr = baseRadius * layer.r;
      const geo = new THREE.SphereGeometry(lr, 32, 24, 0, Math.PI * 1.5, 0, Math.PI);
      const mat = new THREE.MeshStandardMaterial({
        color: layer.color,
        roughness: 0.5,
        side: THREE.DoubleSide,
      });
      group.add(new THREE.Mesh(geo, mat));

      const capGeo = new THREE.CircleGeometry(lr, 24);
      const capMat = new THREE.MeshBasicMaterial({ color: layer.color, side: THREE.DoubleSide });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.rotation.y = Math.PI / 2;
      group.add(cap);
    });
  };

  // Launch Native WebXR Session if supported
  const launchNativeWebXR = async () => {
    if (!rendererRef.current) return;
    try {
      const session = await (navigator as any).xr.requestSession('immersive-ar', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['hit-test', 'dom-overlay'],
        domOverlay: { root: document.body },
      });
      await rendererRef.current.xr.setSession(session);
    } catch (err) {
      console.warn('Native WebXR session launch error, falling back to camera stream AR:', err);
    }
  };

  // Combined Snapshot Photo (Camera background + 3D Planet)
  const captureARPhoto = () => {
    if (!rendererRef.current) return;

    const canvas = document.createElement('canvas');
    const width = 1280;
    const height = 720;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // 1. Draw video feed
    if (videoRef.current && cameraActive) {
      ctx.drawImage(videoRef.current, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Draw WebGL canvas overlay
    ctx.drawImage(rendererRef.current.domElement, 0, 0, width, height);

    // 3. Add telemetry watermark badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(20, height - 70, 360, 50);
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`${bodyData.name} em Realidade Aumentada (AR)`, 35, height - 42);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText(`Sistema Solar Interior • Escala: ${scaleMode}`, 35, height - 26);

    const dataUrl = canvas.toDataURL('image/png');
    setSnapshotTaken(dataUrl);

    // Trigger download
    const link = document.createElement('a');
    link.download = `AR_${bodyData.name}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
      {/* Real-world Live Camera Stream Background */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 w-full h-full object-cover z-0 filter brightness-90"
      />

      {/* Fallback ambient grid if camera isn't permitted */}
      {!cameraActive && (
        <div className="absolute inset-0 z-0 bg-radial from-slate-900/60 to-black/95 pointer-events-none flex items-center justify-center">
          <div className="w-[500px] h-[500px] rounded-full border border-amber-500/10 opacity-30 animate-pulse-slow" />
        </div>
      )}

      {/* 3D WebGL Overlay Canvas Container */}
      <div ref={canvasMountRef} className="absolute inset-0 z-10 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* AR HUD: Top Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2.5 bg-neutral-900/95 border border-neutral-700/80 rounded-xl px-3.5 py-2 shadow-xl">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-none" />
          <div>
            <h3 className="text-xs font-bold text-neutral-100 flex items-center gap-1.5">
              <span>VISUALIZADOR AR (3D)</span>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                AO VIVO
              </span>
            </h3>
            <p className="text-[10px] text-neutral-400">{bodyData.name} ({bodyData.category})</p>
          </div>
        </div>

        {/* Action Controls: WebXR, Gyro, Close */}
        <div className="pointer-events-auto flex items-center gap-2">
          {webxrSupported && (
            <button
              onClick={launchNativeWebXR}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>WebXR Nativo</span>
            </button>
          )}

          <button
            onClick={toggleGyroscope}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border cursor-pointer transition-all flex items-center gap-1.5 ${
              gyroActive
                ? 'bg-amber-500 text-neutral-950 font-semibold border-amber-400'
                : 'bg-neutral-900/90 border-neutral-700 text-neutral-300 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Giroscópio</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-900/95 border border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer shadow-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* AR Camera Reticle & Guidance */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
        <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-dashed border-amber-400/30 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full border border-amber-400/60" />
        </div>
      </div>

      {/* AR HUD: Bottom Controller Dock */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-[min(760px,94vw)] pointer-events-none">
        <div className="pointer-events-auto bg-neutral-900 border border-neutral-700/80 rounded-2xl p-3 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-neutral-200">
          {/* Planet Selector Pills */}
          <div className="flex items-center gap-1 bg-neutral-950/80 p-1 rounded-xl border border-neutral-800 overflow-x-auto max-w-full">
            {(['sun', 'mercury', 'venus', 'earth', 'moon'] as BodyId[]).map((id) => (
              <button
                key={id}
                onClick={() => setSelectedBodyId(id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  selectedBodyId === id
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-md'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                {CELESTIAL_BODIES[id].name}
              </button>
            ))}
          </div>

          {/* Scale Presets */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-mono text-neutral-400 hidden sm:inline">Escala:</span>
            <div className="flex items-center gap-1 bg-neutral-950/80 p-1 rounded-xl border border-neutral-800">
              <button
                onClick={() => setScaleMode('desk')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  scaleMode === 'desk' ? 'bg-neutral-700 text-amber-300 font-bold' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Mesa (15cm)
              </button>
              <button
                onClick={() => setScaleMode('room')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  scaleMode === 'room' ? 'bg-neutral-700 text-amber-300 font-bold' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Sala (1m)
              </button>
              <button
                onClick={() => setScaleMode('giant')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  scaleMode === 'giant' ? 'bg-neutral-700 text-amber-300 font-bold' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Gigante (2.5m)
              </button>
            </div>
          </div>

          {/* Tools: Exploded view & Snapshot Photo */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInternalLayers(!showInternalLayers)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border cursor-pointer transition-all ${
                showInternalLayers
                  ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200'
                  : 'bg-neutral-950/80 border-neutral-800 text-neutral-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Camadas 3D</span>
            </button>

            <button
              onClick={captureARPhoto}
              title="Tirar foto com o planeta em AR"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 shadow-lg shadow-amber-500/20 border border-amber-300/40 cursor-pointer transition-all active:scale-95"
            >
              <Camera className="w-4 h-4 fill-neutral-950" />
              <span>Foto AR</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
