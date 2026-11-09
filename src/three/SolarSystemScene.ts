import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BodyId } from '../types/solar';
import {
  createSunTexture,
  createMercuryTexture,
  createVenusCloudTexture,
  createVenusSurfaceTexture,
  createEarthTexture,
  createEarthCloudTexture,
  createMoonTexture,
  createInternalCoreTexture,
} from '../utils/proceduralTextures';

// Pre-allocated math scratchpads (Zero GC inside render loop directive)
const _vec3 = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _camOffset = new THREE.Vector3();

export interface SceneCallbacks {
  onSelectBody: (id: BodyId) => void;
  onFpsUpdate?: (fps: number) => void;
}

export class SolarSystemScene {
  public container: HTMLElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public controls: OrbitControls;
  public isSoftwareGl: boolean;

  // Groups and objects
  public sunGroup: THREE.Group = new THREE.Group();
  public mercuryPivot: THREE.Group = new THREE.Group();
  public mercuryGroup: THREE.Group = new THREE.Group();
  public venusPivot: THREE.Group = new THREE.Group();
  public venusGroup: THREE.Group = new THREE.Group();
  public earthPivot: THREE.Group = new THREE.Group();
  public earthTiltGroup: THREE.Group = new THREE.Group();
  public earthGroup: THREE.Group = new THREE.Group();
  public moonPivot: THREE.Group = new THREE.Group();
  public moonGroup: THREE.Group = new THREE.Group();

  // Internal layer cross-section groups (for Exploded/Structure view)
  public sunLayersGroup: THREE.Group = new THREE.Group();
  public mercuryLayersGroup: THREE.Group = new THREE.Group();
  public venusLayersGroup: THREE.Group = new THREE.Group();
  public earthLayersGroup: THREE.Group = new THREE.Group();
  public moonLayersGroup: THREE.Group = new THREE.Group();

  // Atmosphere & special sub-parts
  private sunCorona: THREE.Mesh | null = null;
  private sunProminences: THREE.Group = new THREE.Group();
  private venusAtmosphereMesh: THREE.Mesh | null = null;
  private earthCloudMesh: THREE.Mesh | null = null;
  private earthAtmosphereGlow: THREE.Mesh | null = null;

  // Starfield and orbits
  private starfield: THREE.Points | null = null;
  private orbitLinesGroup: THREE.Group = new THREE.Group();

  // Animation & simulation state
  private isRunning: boolean = true;
  private simulationSpeed: number = 1.0;
  private selectedBody: BodyId = 'all';
  private showOrbits: boolean = true;
  private showLabels: boolean = true;
  private explodedView: boolean = false;
  private isARMode: boolean = false;

  // Camera focus animation
  private targetCameraPos: THREE.Vector3 = new THREE.Vector3(0, 45, 85);
  private targetControlsLookAt: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private isCameraTransitioning: boolean = false;

  private frameId: number = 0;
  private clock: THREE.Clock = new THREE.Clock();
  private callbacks: SceneCallbacks;

  // Raycaster for click / hover
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private pointer: THREE.Vector2 = new THREE.Vector2();
  private clickableMeshes: { mesh: THREE.Object3D; id: BodyId }[] = [];

  constructor(container: HTMLElement, callbacks: SceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // 1. Detect software WebGL
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    // 2. Initialize modern WebGLRenderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: true, // transparent for AR background support
      preserveDrawingBuffer: true, // enables crisp snapshot photography
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);

    // Support WebXR if available
    if ('xr' in navigator) {
      this.renderer.xr.enabled = true;
    }

    container.appendChild(this.renderer.domElement);

    // 3. Scene & Camera Setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 45, 90);

    // 4. OrbitControls with smooth exponential damping
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 350;
    this.controls.minDistance = 2.0;
    this.controls.target.set(0, 0, 0);

    // Cancel automated camera transition on manual user orbit
    this.controls.addEventListener('start', () => {
      this.isCameraTransitioning = false;
    });

    // 5. Mandatory Studio Environment Reflection (RoomEnvironment + PMREMGenerator)
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch {
      // safe fallback
    }

    // 6. Balanced Cosmic Lighting
    this.setupLighting();

    // 7. Starfield Background
    this.buildStarfield();

    // 8. Celestial Bodies Hierarchy (Composite 3-12 Part Procedural Models)
    this.buildCompositeBodies();

    // 9. Orbit Trails
    this.buildOrbitLines();

    // 10. Event listeners
    this.onResize = this.onResize.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    window.addEventListener('resize', this.onResize);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);

    // 11. Start animation loop
    this.startLoop();
  }

  // Balanced Lighting Rig
  private setupLighting() {
    // 1. Central Solar Radiance PointLight
    const sunLight = new THREE.PointLight(0xFFF2D6, 4.0, 500, 0.4);
    sunLight.position.set(0, 0, 0);
    this.scene.add(sunLight);

    // 2. Cool deep cosmic Hemisphere fill so night sides have subtle visibility
    const hemiLight = new THREE.HemisphereLight(0x406080, 0x111625, 0.6);
    this.scene.add(hemiLight);

    // 3. Ambient starlight
    const ambientLight = new THREE.AmbientLight(0x202636, 0.35);
    this.scene.add(ambientLight);
  }

  // Procedural 2,500 Starfield with subtle spectral colors
  private buildStarfield() {
    const starCount = 2500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    const spectralColors = [
      new THREE.Color(0x9BB0FF), // Class O/B (Blue-white)
      new THREE.Color(0xCAD7FF), // Class A (White)
      new THREE.Color(0xF8F9FF), // Class F (Yellow-white)
      new THREE.Color(0xFFF4E8), // Class G (Yellow, Solar)
      new THREE.Color(0xFFD2A1), // Class K (Orange)
      new THREE.Color(0xFFB56C), // Class M (Red dwarf)
    ];

    for (let i = 0; i < starCount; i++) {
      // Distribute evenly on spherical shell (radius 400 - 900)
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 400 + Math.random() * 450;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const col = spectralColors[Math.floor(Math.random() * spectralColors.length)];
      // Subtle brightness variation
      const lum = 0.5 + Math.random() * 0.5;
      colors[i * 3] = col.r * lum;
      colors[i * 3 + 1] = col.g * lum;
      colors[i * 3 + 2] = col.b * lum;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });

    this.starfield = new THREE.Points(geometry, material);
    this.scene.add(this.starfield);
  }

  // Assemble Composite 3-12 Part Procedural Models for each Body
  private buildCompositeBodies() {
    // -------------------------------------------------------------
    // 1. O SOL (Sun - 7-Part Composite Model)
    // -------------------------------------------------------------
    this.sunGroup = new THREE.Group();
    this.sunGroup.position.set(0, 0, 0);

    // Part 1: Main Photosphere Sphere
    const sunTexture = createSunTexture(this.renderer);
    const sunGeo = new THREE.SphereGeometry(6.5, 64, 48);
    const sunMat = new THREE.MeshBasicMaterial({
      map: sunTexture,
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunGroup.add(sunMesh);
    this.clickableMeshes.push({ mesh: sunMesh, id: 'sun' });

    // Part 2: Inner Chromosphere Glow Shell
    const chromoGeo = new THREE.SphereGeometry(6.68, 48, 36);
    const chromoMat = new THREE.MeshBasicMaterial({
      color: 0xFFA000,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    const chromoMesh = new THREE.Mesh(chromoGeo, chromoMat);
    this.sunGroup.add(chromoMesh);

    // Part 3: Ethereal Corona Halo
    const coronaGeo = new THREE.SphereGeometry(7.6, 32, 24);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xFF6F00,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    this.sunCorona = new THREE.Mesh(coronaGeo, coronaMat);
    this.sunGroup.add(this.sunCorona);

    // Part 4 & 5: Magnetic Prominences (Solar Flares / Arches using TubeGeometry)
    this.sunProminences = new THREE.Group();
    const createProminenceCurve = (scale = 1, rotZ = 0) => {
      const curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(5.8, 0, 0),
        new THREE.Vector3(7.4 * scale, 2.2 * scale, 0),
        new THREE.Vector3(7.4 * scale, -2.2 * scale, 0),
        new THREE.Vector3(5.8, 0, 0)
      );
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.12 * scale, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: 0xFF3D00,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      tubeMesh.rotation.z = rotZ;
      return tubeMesh;
    };
    this.sunProminences.add(createProminenceCurve(1.1, 0.4));
    this.sunProminences.add(createProminenceCurve(0.9, -1.8));
    this.sunProminences.add(createProminenceCurve(1.2, 2.5));
    this.sunGroup.add(this.sunProminences);

    // Part 6 & 7: Sun Internal Layers Structure (for exploded view)
    this.sunLayersGroup = this.buildInternalLayers('sun', 6.5, [
      { name: 'Núcleo de Fusão', color: 0xFFFFFF, r: 0.28 },
      { name: 'Zona Radiativa', color: 0xFFA000, r: 0.58 },
      { name: 'Zona Convectiva', color: 0xE65100, r: 0.88 },
      { name: 'Fotosfera', color: 0xFFD54F, r: 1.0 },
    ]);
    this.sunLayersGroup.visible = false;
    this.sunGroup.add(this.sunLayersGroup);

    this.scene.add(this.sunGroup);

    // -------------------------------------------------------------
    // 2. MERCÚRIO (Mercury - 5-Part Composite Model)
    // -------------------------------------------------------------
    this.mercuryPivot = new THREE.Group();
    this.scene.add(this.mercuryPivot);

    this.mercuryGroup = new THREE.Group();
    this.mercuryGroup.position.set(18, 0, 0); // Visual orbit radius

    const mercTexture = createMercuryTexture(this.renderer);
    const mercGeo = new THREE.SphereGeometry(1.15, 48, 36);
    const mercMat = new THREE.MeshStandardMaterial({
      map: mercTexture,
      roughness: 0.88,
      metalness: 0.12,
    });
    const mercMesh = new THREE.Mesh(mercGeo, mercMat);
    this.mercuryGroup.add(mercMesh);
    this.clickableMeshes.push({ mesh: mercMesh, id: 'mercury' });

    // Part 2: Caloris Basin Multi-Ring Impact Rim (RingGeometry accent)
    const calorisRimGeo = new THREE.RingGeometry(0.35, 0.45, 24);
    const calorisRimMat = new THREE.MeshBasicMaterial({
      color: 0xCFD8DC,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const calorisRim = new THREE.Mesh(calorisRimGeo, calorisRimMat);
    calorisRim.position.set(0.95, 0.2, 0.5);
    calorisRim.lookAt(0.95 * 2, 0.2 * 2, 0.5 * 2);
    this.mercuryGroup.add(calorisRim);

    // Part 3: Mercury Super-Metallic Iron Core cross-section
    this.mercuryLayersGroup = this.buildInternalLayers('mercury', 1.15, [
      { name: 'Núcleo de Ferro (85% raio)', color: 0xCFD8DC, r: 0.82 },
      { name: 'Manto Silicato Fino', color: 0x8D6E63, r: 0.95 },
      { name: 'Crosta Regolito', color: 0x455A64, r: 1.0 },
    ]);
    this.mercuryLayersGroup.visible = false;
    this.mercuryGroup.add(this.mercuryLayersGroup);

    this.mercuryPivot.add(this.mercuryGroup);

    // -------------------------------------------------------------
    // 3. VÊNUS (Venus - 6-Part Composite Model)
    // -------------------------------------------------------------
    this.venusPivot = new THREE.Group();
    this.scene.add(this.venusPivot);

    this.venusGroup = new THREE.Group();
    this.venusGroup.position.set(28, 0, 0);

    // Part 1: Dense Supercritical Atmosphere & Cloud Shell
    const venusCloudTex = createVenusCloudTexture(this.renderer);
    const venusGeo = new THREE.SphereGeometry(2.15, 64, 48);
    const venusCloudMat = new THREE.MeshStandardMaterial({
      map: venusCloudTex,
      roughness: 0.65,
      metalness: 0.05,
    });
    this.venusAtmosphereMesh = new THREE.Mesh(venusGeo, venusCloudMat);
    this.venusGroup.add(this.venusAtmosphereMesh);
    this.clickableMeshes.push({ mesh: this.venusAtmosphereMesh, id: 'venus' });

    // Part 2: Inner Volcanic Basalt Crust Sphere (Sub-surface underneath clouds)
    const venusSurfaceTex = createVenusSurfaceTexture(this.renderer);
    const venusSubGeo = new THREE.SphereGeometry(2.05, 48, 36);
    const venusSubMat = new THREE.MeshStandardMaterial({
      map: venusSurfaceTex,
      roughness: 0.85,
      metalness: 0.2,
    });
    const venusSubMesh = new THREE.Mesh(venusSubGeo, venusSubMat);
    this.venusGroup.add(venusSubMesh);

    // Part 3: Polar Vortex Atmospheric Accents (North & South rings)
    const vortexGeo = new THREE.RingGeometry(0.3, 0.7, 32);
    const vortexMat = new THREE.MeshBasicMaterial({
      color: 0xFFF9C4,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const northVortex = new THREE.Mesh(vortexGeo, vortexMat);
    northVortex.position.set(0, 2.16, 0);
    northVortex.rotation.x = Math.PI / 2;
    this.venusGroup.add(northVortex);

    const southVortex = new THREE.Mesh(vortexGeo, vortexMat);
    southVortex.position.set(0, -2.16, 0);
    southVortex.rotation.x = -Math.PI / 2;
    this.venusGroup.add(southVortex);

    // Part 4: Venus Internal Layers (Core, Viscous Mantle, Crust)
    this.venusLayersGroup = this.buildInternalLayers('venus', 2.15, [
      { name: 'Núcleo Ferro-Níquel', color: 0xFFE082, r: 0.52 },
      { name: 'Manto de Silicatos', color: 0xD84315, r: 0.92 },
      { name: 'Crosta Basáltica', color: 0xBF360C, r: 1.0 },
    ]);
    this.venusLayersGroup.visible = false;
    this.venusGroup.add(this.venusLayersGroup);

    this.venusPivot.add(this.venusGroup);

    // -------------------------------------------------------------
    // 4. TERRA (Earth - 8-Part Composite Model)
    // -------------------------------------------------------------
    this.earthPivot = new THREE.Group();
    this.scene.add(this.earthPivot);

    this.earthGroup = new THREE.Group();
    this.earthGroup.position.set(40, 0, 0); // Earth orbital distance

    // Axial tilt rig (23.44° degrees)
    this.earthTiltGroup = new THREE.Group();
    this.earthTiltGroup.rotation.z = THREE.MathUtils.degToRad(23.44);
    this.earthGroup.add(this.earthTiltGroup);

    // Part 1: Continental & Oceanic Earth Sphere
    const earthTex = createEarthTexture(this.renderer);
    const earthGeo = new THREE.SphereGeometry(2.25, 64, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.55,
      metalness: 0.15,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    this.earthTiltGroup.add(earthMesh);
    this.clickableMeshes.push({ mesh: earthMesh, id: 'earth' });

    // Part 2: Dynamic Atmospheric Cloud Sphere (translucent & rotates independently)
    const earthCloudTex = createEarthCloudTexture(this.renderer);
    const cloudGeo = new THREE.SphereGeometry(2.28, 48, 36);
    const cloudMat = new THREE.MeshStandardMaterial({
      map: earthCloudTex,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    this.earthCloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    this.earthTiltGroup.add(this.earthCloudMesh);

    // Part 3: Blue Rayleigh Atmospheric Scattering Fresnel Glow
    const glowGeo = new THREE.SphereGeometry(2.38, 32, 24);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x64B5F6,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    this.earthAtmosphereGlow = new THREE.Mesh(glowGeo, glowMat);
    this.earthTiltGroup.add(this.earthAtmosphereGlow);

    // Part 4: Earth 4-Layer Internal Structure (Inner Core, Outer Core, Mantle, Crust)
    this.earthLayersGroup = this.buildInternalLayers('earth', 2.25, [
      { name: 'Núcleo Interno Sólido', color: 0xFFF9C4, r: 0.26 },
      { name: 'Núcleo Externo Líquido', color: 0xFFB74D, r: 0.55 },
      { name: 'Manto Convectivo', color: 0xE65100, r: 0.94 },
      { name: 'Crosta & Oceanos', color: 0x1E88E5, r: 1.0 },
    ]);
    this.earthLayersGroup.visible = false;
    this.earthTiltGroup.add(this.earthLayersGroup);

    // -------------------------------------------------------------
    // 5. A LUA (Moon - 6-Part Composite Model orbiting Earth)
    // -------------------------------------------------------------
    this.moonPivot = new THREE.Group();
    this.earthGroup.add(this.moonPivot); // Moon orbits Earth center

    this.moonGroup = new THREE.Group();
    this.moonGroup.position.set(6.0, 0, 0); // Moon distance from Earth

    const moonTex = createMoonTexture(this.renderer);
    const moonGeo = new THREE.SphereGeometry(0.85, 48, 36);
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonTex,
      roughness: 0.92,
      metalness: 0.08,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.moonGroup.add(moonMesh);
    this.clickableMeshes.push({ mesh: moonMesh, id: 'moon' });

    // Part 2: Apollo 11 Lunar Module (Eagle) Miniature Marker
    const lemGroup = new THREE.Group();
    lemGroup.position.set(0.65, 0.45, 0.35);
    lemGroup.scale.set(0.12, 0.12, 0.12);

    // Descent Stage (gold foil octagonal prism)
    const lemBaseGeo = new THREE.CylinderGeometry(0.8, 0.9, 0.6, 8);
    const lemBaseMat = new THREE.MeshStandardMaterial({
      color: 0xFFD54F,
      metalness: 0.9,
      roughness: 0.2,
    });
    const lemBase = new THREE.Mesh(lemBaseGeo, lemBaseMat);
    lemGroup.add(lemBase);

    // Ascent Stage (silver cabin)
    const lemTopGeo = new THREE.BoxGeometry(0.8, 0.7, 0.8);
    const lemTopMat = new THREE.MeshStandardMaterial({
      color: 0xCFD8DC,
      metalness: 0.8,
      roughness: 0.3,
    });
    const lemTop = new THREE.Mesh(lemTopGeo, lemTopMat);
    lemTop.position.y = 0.55;
    lemGroup.add(lemTop);

    // Lander leg tubes
    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.0);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x90A4AE, metalness: 0.5 });
    for (let l = 0; l < 4; l++) {
      const leg = new THREE.Mesh(legGeo, legMat);
      const angle = (l * Math.PI) / 2;
      leg.position.set(Math.cos(angle) * 0.7, -0.4, Math.sin(angle) * 0.7);
      leg.rotation.z = Math.cos(angle) * 0.4;
      leg.rotation.x = Math.sin(angle) * 0.4;
      lemGroup.add(leg);
    }
    this.moonGroup.add(lemGroup);

    // Part 3: Moon Internal Structure (Small Iron Core & Mantle)
    this.moonLayersGroup = this.buildInternalLayers('moon', 0.85, [
      { name: 'Núcleo Pequeno de Ferro', color: 0xCFD8DC, r: 0.22 },
      { name: 'Manto Lítico', color: 0x78909C, r: 0.88 },
      { name: 'Crosta de Anortosita', color: 0xB0BEC5, r: 1.0 },
    ]);
    this.moonLayersGroup.visible = false;
    this.moonGroup.add(this.moonLayersGroup);

    // Lunar Orbit Line around Earth
    const moonOrbitGeo = new THREE.BufferGeometry();
    const moonOrbitPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const theta = (i / 64) * Math.PI * 2;
      moonOrbitPts.push(new THREE.Vector3(Math.cos(theta) * 6.0, 0, Math.sin(theta) * 6.0));
    }
    moonOrbitGeo.setFromPoints(moonOrbitPts);
    const moonOrbitMat = new THREE.LineBasicMaterial({
      color: 0x78909C,
      transparent: true,
      opacity: 0.35,
    });
    const moonOrbitLine = new THREE.Line(moonOrbitGeo, moonOrbitMat);
    this.earthGroup.add(moonOrbitLine);

    this.moonPivot.add(this.moonGroup);
    this.earthPivot.add(this.earthGroup);
  }

  // Builds an interactive Exploded/Cutaway 3D Group showing planetary internal layers
  private buildInternalLayers(
    id: string,
    baseRadius: number,
    layers: { name: string; color: number; r: number }[]
  ): THREE.Group {
    const group = new THREE.Group();

    // Create concentric cutaway shells (hemispheres with cross-section faces)
    layers.forEach((layer, idx) => {
      const layerR = baseRadius * layer.r;
      const geo = new THREE.SphereGeometry(
        layerR,
        36,
        24,
        0,
        Math.PI * 1.5, // 270 degrees cutaway wedge!
        0,
        Math.PI
      );
      const mat = new THREE.MeshStandardMaterial({
        color: layer.color,
        roughness: 0.4 + idx * 0.15,
        metalness: 0.2,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);

      // Slice boundary cap
      const capGeo = new THREE.CircleGeometry(layerR, 32);
      const capMat = new THREE.MeshBasicMaterial({
        color: layer.color,
        side: THREE.DoubleSide,
      });
      const cap1 = new THREE.Mesh(capGeo, capMat);
      cap1.rotation.y = Math.PI / 2;
      group.add(cap1);
    });

    return group;
  }

  // Planetary Orbit Lines around the Sun
  private buildOrbitLines() {
    this.orbitLinesGroup = new THREE.Group();

    const orbits = [
      { r: 18, color: 0x90A4AE, name: 'Mercúrio' },
      { r: 28, color: 0xFFB74D, name: 'Vênus' },
      { r: 40, color: 0x64B5F6, name: 'Terra' },
    ];

    orbits.forEach((orb) => {
      const points: THREE.Vector3[] = [];
      const segments = 128;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(theta) * orb.r, 0, Math.sin(theta) * orb.r));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: orb.color,
        transparent: true,
        opacity: 0.35,
      });
      const line = new THREE.Line(geo, mat);
      this.orbitLinesGroup.add(line);
    });

    this.scene.add(this.orbitLinesGroup);
  }

  // Pointer Click Interaction (Raycaster)
  private onPointerDown(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshesToTest = this.clickableMeshes.map((c) => c.mesh);
    const intersects = this.raycaster.intersectObjects(meshesToTest, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const found = this.clickableMeshes.find((c) => c.mesh === hit);
      if (found) {
        this.selectBody(found.id);
        this.callbacks.onSelectBody(found.id);
      }
    }
  }

  // Select Body and Trigger Smooth Cinematic Camera Transition
  public selectBody(id: BodyId) {
    this.selectedBody = id;

    // Reset exploded layer visibility unless explicitly enabled
    this.updateLayersVisibility();

    if (id === 'all') {
      this.targetCameraPos.set(0, 50, 95);
      this.targetControlsLookAt.set(0, 0, 0);
      this.isCameraTransitioning = true;
      return;
    }

    if (id === 'sun') {
      this.targetCameraPos.set(0, 10, 22);
      this.targetControlsLookAt.set(0, 0, 0);
      this.isCameraTransitioning = true;
      return;
    }

    // Dynamic track targets for orbiting bodies
    this.isCameraTransitioning = true;
  }

  // Toggle internal exploded structure view
  public setExplodedView(exploded: boolean) {
    this.explodedView = exploded;
    this.updateLayersVisibility();
  }

  private updateLayersVisibility() {
    this.sunLayersGroup.visible = this.explodedView && this.selectedBody === 'sun';
    this.mercuryLayersGroup.visible = this.explodedView && this.selectedBody === 'mercury';
    this.venusLayersGroup.visible = this.explodedView && this.selectedBody === 'venus';
    this.earthLayersGroup.visible = this.explodedView && this.selectedBody === 'earth';
    this.moonLayersGroup.visible = this.explodedView && this.selectedBody === 'moon';
  }

  // Simulation controls
  public togglePlayPause() {
    this.isRunning = !this.isRunning;
    return this.isRunning;
  }

  public setSpeed(speed: number) {
    this.simulationSpeed = speed;
  }

  public toggleOrbits() {
    this.showOrbits = !this.showOrbits;
    this.orbitLinesGroup.visible = this.showOrbits;
    return this.showOrbits;
  }

  public toggleLabels() {
    this.showLabels = !this.showLabels;
    return this.showLabels;
  }

  public setARMode(enabled: boolean) {
    this.isARMode = enabled;
    if (this.starfield) {
      this.starfield.visible = !enabled; // Hide stars in AR so live camera is visible
    }
    if (this.orbitLinesGroup) {
      this.orbitLinesGroup.visible = !enabled && this.showOrbits;
    }
    this.renderer.setClearColor(0x000000, enabled ? 0 : 1);
  }

  // Get current world position of any celestial body
  public getBodyWorldPosition(id: BodyId, outVec: THREE.Vector3): THREE.Vector3 {
    switch (id) {
      case 'sun':
        return outVec.set(0, 0, 0);
      case 'mercury':
        return this.mercuryGroup.getWorldPosition(outVec);
      case 'venus':
        return this.venusGroup.getWorldPosition(outVec);
      case 'earth':
        return this.earthGroup.getWorldPosition(outVec);
      case 'moon':
        return this.moonGroup.getWorldPosition(outVec);
      default:
        return outVec.set(0, 0, 0);
    }
  }

  // Window resize handler
  private onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // Render loop with exponential damping and software WebGL pacing
  private startLoop() {
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = 0;

    const tick = () => {
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      frameCount++;
      fpsTimer += delta;
      if (fpsTimer >= 1.0) {
        if (this.callbacks.onFpsUpdate) {
          this.callbacks.onFpsUpdate(Math.round(frameCount / fpsTimer));
        }
        frameCount = 0;
        fpsTimer = 0;
      }

      // 1. Advance Orbital & Axial Rotations (Keplerian approximations)
      if (this.isRunning) {
        const timeScale = delta * this.simulationSpeed;

        // Mercury orbit (88 days period)
        this.mercuryPivot.rotation.y += timeScale * 0.415;
        this.mercuryGroup.rotation.y += timeScale * 0.05;

        // Venus orbit (225 days period) & retrograde slow spin
        this.venusPivot.rotation.y += timeScale * 0.162;
        this.venusGroup.rotation.y -= timeScale * 0.02; // retrograde
        if (this.venusAtmosphereMesh) {
          this.venusAtmosphereMesh.rotation.y -= timeScale * 0.08; // super-rotation winds
        }

        // Earth orbit (365 days period) & 24h spin
        this.earthPivot.rotation.y += timeScale * 0.1;
        this.earthTiltGroup.rotation.y += timeScale * 0.8; // Earth day/night spin
        if (this.earthCloudMesh) {
          this.earthCloudMesh.rotation.y += timeScale * 0.95; // Atmospheric cloud drift
        }

        // Moon orbit around Earth (27.3 days)
        this.moonPivot.rotation.y += timeScale * 1.35;
        this.moonGroup.rotation.y += timeScale * 1.35; // Synchronous tidal lock

        // Sun axial rotation & prominence pulse
        this.sunGroup.rotation.y += timeScale * 0.04;
        this.sunProminences.rotation.y += timeScale * 0.08;
      }

      // 2. Smooth Exponential Damped Camera Navigation
      if (this.selectedBody !== 'all') {
        this.getBodyWorldPosition(this.selectedBody, _targetPos);

        // Compute ideal camera offset based on body radius
        const offsetDist =
          this.selectedBody === 'sun'
            ? 22
            : this.selectedBody === 'moon'
            ? 4.5
            : this.selectedBody === 'mercury'
            ? 5.5
            : 8.5;

        _camOffset.set(offsetDist * 0.7, offsetDist * 0.4, offsetDist);

        if (this.isCameraTransitioning) {
          // Exponential damping towards target position and lookAt
          this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, _targetPos.x, 4.0, delta);
          this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, _targetPos.y, 4.0, delta);
          this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, _targetPos.z, 4.0, delta);

          const desiredCamX = _targetPos.x + _camOffset.x;
          const desiredCamY = _targetPos.y + _camOffset.y;
          const desiredCamZ = _targetPos.z + _camOffset.z;

          this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, desiredCamX, 4.0, delta);
          this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, desiredCamY, 4.0, delta);
          this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, desiredCamZ, 4.0, delta);

          // Stop transition lock when close enough so user has free orbit
          if (this.camera.position.distanceTo(_vec3.set(desiredCamX, desiredCamY, desiredCamZ)) < 0.2) {
            this.isCameraTransitioning = false;
          }
        } else if (this.isRunning) {
          // Keep gently tracking orbiting body center while allowing user orbit rotation
          const shift = _targetPos.clone().sub(this.controls.target);
          this.controls.target.copy(_targetPos);
          this.camera.position.add(shift);
        }
      } else if (this.isCameraTransitioning) {
        this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, 0, 4.0, delta);
        this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, 0, 4.0, delta);
        this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, 0, 4.0, delta);

        this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, 0, 4.0, delta);
        this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, 50, 4.0, delta);
        this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, 95, 4.0, delta);

        if (this.camera.position.distanceTo(_vec3.set(0, 50, 95)) < 0.5) {
          this.isCameraTransitioning = false;
        }
      }

      // Update OrbitControls
      this.controls.update();

      // 3. Render Scene
      this.renderer.render(this.scene, this.camera);

      // 4. Software WebGL Pacing (Directive compliance)
      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  // Paced loop helper for software WebGL
  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (gl && 'fenceSync' in gl) {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 60);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 60);
    }
  }

  // Capture clean high-res snapshot
  public captureSnapshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  // Cleanup on unmount
  public dispose() {
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.onResize);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
