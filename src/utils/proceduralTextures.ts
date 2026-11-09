import * as THREE from 'three';

/**
 * Creates high-fidelity procedural textures using HTML5 2D Canvas.
 * Strictly adheres to Three.js directives:
 * - SRGBColorSpace for color maps
 * - Max anisotropy set
 * - Zero external asset / 404 dependencies
 */

// Helper to configure procedural canvas texture
function configureTexture(canvas: HTMLCanvasElement, renderer?: THREE.WebGLRenderer, isDataMap = false): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = isDataMap ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (renderer) {
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  }
  return texture;
}

// 1. Procedural Sun Photosphere & Granules
export function createSunTexture(renderer?: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size / 2;
  const ctx = canvas.getContext('2d')!;

  // Base glowing yellow-orange gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGrad.addColorStop(0, '#FFE082');
  bgGrad.addColorStop(0.5, '#FFA000');
  bgGrad.addColorStop(1, '#FF6F00');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Solar convection cells / granules
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const idx = (y * canvas.width + x) * 4;
      const nx = (x / canvas.width) * 18;
      const ny = (y / canvas.height) * 9;
      
      // Multiscale synthetic cellular noise
      const n1 = Math.sin(nx * 2.5 + Math.cos(ny * 3.1)) * 0.5 + 0.5;
      const n2 = Math.cos(nx * 5.3 - Math.sin(ny * 6.2)) * 0.5 + 0.5;
      const n3 = Math.sin(nx * 14.1 + ny * 12.7) * 0.5 + 0.5;
      const intensity = n1 * 0.5 + n2 * 0.35 + n3 * 0.15;

      const r = Math.min(255, 240 + intensity * 15);
      const g = Math.min(255, 120 + intensity * 110);
      const b = Math.min(255, 10 + intensity * 60);

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Add sunspots (dark umbra and reddish penumbra)
  const spots = [
    { x: canvas.width * 0.3, y: canvas.height * 0.42, r: 24 },
    { x: canvas.width * 0.33, y: canvas.height * 0.44, r: 14 },
    { x: canvas.width * 0.72, y: canvas.height * 0.58, r: 20 },
    { x: canvas.width * 0.68, y: canvas.height * 0.61, r: 12 },
    { x: canvas.width * 0.52, y: canvas.height * 0.35, r: 16 },
  ];

  for (const s of spots) {
    const spotGrad = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, s.r);
    spotGrad.addColorStop(0, '#3E2723'); // Umbra
    spotGrad.addColorStop(0.5, '#795548'); // Penumbra
    spotGrad.addColorStop(0.85, '#E65100'); // Hot flare edge
    spotGrad.addColorStop(1, 'rgba(255, 160, 0, 0)');
    ctx.fillStyle = spotGrad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  return configureTexture(canvas, renderer);
}

// 2. Procedural Mercury Surface (Heavily cratered regolith)
export function createMercuryTexture(renderer?: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size / 2;
  const ctx = canvas.getContext('2d')!;

  // Baseline silvery-gray regolith
  ctx.fillStyle = '#78909C';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Grainy basaltic noise
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 45;
    const base = 120 + noise;
    data[i] = Math.max(0, Math.min(255, base - 8));
    data[i + 1] = Math.max(0, Math.min(255, base - 4));
    data[i + 2] = Math.max(0, Math.min(255, base));
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  // Large impact basins and crater rims (e.g. Caloris Planitia)
  const craters = [
    { x: canvas.width * 0.25, y: canvas.height * 0.5, r: 75, depth: 0.8 },
    { x: canvas.width * 0.65, y: canvas.height * 0.35, r: 55, depth: 0.7 },
    { x: canvas.width * 0.45, y: canvas.height * 0.7, r: 42, depth: 0.6 },
    { x: canvas.width * 0.8, y: canvas.height * 0.65, r: 35, depth: 0.5 },
    { x: canvas.width * 0.12, y: canvas.height * 0.3, r: 28, depth: 0.5 },
  ];

  // Minor crater scatter
  for (let i = 0; i < 90; i++) {
    craters.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 4 + Math.random() * 18,
      depth: 0.3 + Math.random() * 0.4,
    });
  }

  for (const c of craters) {
    // Crater floor
    const gFloor = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
    gFloor.addColorStop(0, '#37474F');
    gFloor.addColorStop(0.7, '#455A64');
    gFloor.addColorStop(0.9, '#CFD8DC'); // Bright raised rim
    gFloor.addColorStop(1, 'rgba(120, 144, 156, 0)');
    ctx.fillStyle = gFloor;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();

    // Ejecta rays for prominent craters
    if (c.r > 30) {
      ctx.strokeStyle = 'rgba(236, 239, 241, 0.25)';
      ctx.lineWidth = 1.5;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x + Math.cos(a) * (c.r * 2.2), c.y + Math.sin(a) * (c.r * 2.2));
        ctx.stroke();
      }
    }
  }

  return configureTexture(canvas, renderer);
}

// 3. Procedural Venus Clouds (Sulfuric acid banded swirls)
export function createVenusCloudTexture(renderer?: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size / 2;
  const ctx = canvas.getContext('2d')!;

  // Smooth warm cream/amber base
  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, '#FFE082');
  bg.addColorStop(0.2, '#FFD54F');
  bg.addColorStop(0.5, '#FFCA28');
  bg.addColorStop(0.8, '#FFD54F');
  bg.addColorStop(1, '#FFE082');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Atmospheric planetary chevron bands & high-altitude vortices
  for (let y = 0; y < canvas.height; y += 4) {
    const latFactor = Math.abs(y - canvas.height / 2) / (canvas.height / 2);
    const bandWave = Math.sin(y * 0.08) * 15;
    const bandAlpha = 0.15 + (1 - latFactor) * 0.2;

    ctx.fillStyle = y % 8 === 0 ? `rgba(255, 248, 225, ${bandAlpha})` : `rgba(215, 138, 56, ${bandAlpha * 0.8})`;
    ctx.beginPath();
    ctx.moveTo(0, y + bandWave);
    for (let x = 0; x < canvas.width; x += 32) {
      const swirl = Math.sin(x * 0.02 + y * 0.05) * 8;
      ctx.lineTo(x, y + bandWave + swirl);
    }
    ctx.lineTo(canvas.width, y + 8);
    ctx.lineTo(0, y + 8);
    ctx.fill();
  }

  // Polar vortex caps
  const northVortex = ctx.createRadialGradient(canvas.width / 2, 10, 5, canvas.width / 2, 10, canvas.height * 0.2);
  northVortex.addColorStop(0, 'rgba(255, 253, 231, 0.6)');
  northVortex.addColorStop(1, 'rgba(255, 202, 40, 0)');
  ctx.fillStyle = northVortex;
  ctx.fillRect(0, 0, canvas.width, canvas.height * 0.25);

  const southVortex = ctx.createRadialGradient(canvas.width / 2, canvas.height - 10, 5, canvas.width / 2, canvas.height - 10, canvas.height * 0.2);
  southVortex.addColorStop(0, 'rgba(255, 253, 231, 0.6)');
  southVortex.addColorStop(1, 'rgba(255, 202, 40, 0)');
  ctx.fillStyle = southVortex;
  ctx.fillRect(0, canvas.height * 0.75, canvas.width, canvas.height * 0.25);

  return configureTexture(canvas, renderer);
}

// 4. Procedural Venus Sub-Surface (Volcanic basalt crust & molten fissures)
export function createVenusSurfaceTexture(renderer?: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size / 2;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#3E2723';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Volcanic plains
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r = 25 + Math.random() * 80;
    const g = ctx.createRadialGradient(x, y, 5, x, y, r);
    g.addColorStop(0, '#BF360C');
    g.addColorStop(0.5, '#5D4037');
    g.addColorStop(1, 'rgba(62, 39, 35, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Glowing lava rift lines (chasmata)
  ctx.strokeStyle = '#FF6D00';
  ctx.lineWidth = 2;
  for (let i = 0; i < 15; i++) {
    let lx = Math.random() * canvas.width;
    let ly = Math.random() * canvas.height;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    for (let s = 0; s < 12; s++) {
      lx += (Math.random() - 0.5) * 60;
      ly += (Math.random() - 0.5) * 40;
      ctx.lineTo(lx, ly);
    }
    ctx.stroke();
  }

  return configureTexture(canvas, renderer);
}

// 5. Procedural Earth Surface (Continents, oceans, polar caps, terrain)
export function createEarthTexture(renderer?: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size / 2;
  const ctx = canvas.getContext('2d')!;

  // 1. Deep Ocean Base
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  oceanGrad.addColorStop(0, '#0D47A1');
  oceanGrad.addColorStop(0.5, '#01579B');
  oceanGrad.addColorStop(1, '#0D47A1');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Continental Shapes (Approximating Eurasia, Africa, Americas, Australia, Antarctica)
  ctx.fillStyle = '#2E7D32'; // Forest / vegetation green
  const w = canvas.width;
  const h = canvas.height;

  // Function to draw rough continental landmass
  const drawContinent = (points: [number, number][], fillColor: string, strokeColor?: string) => {
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.moveTo(points[0][0] * w, points[0][1] * h);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0] * w, points[i][1] * h);
    }
    ctx.closePath();
    ctx.fill();
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  // North America
  drawContinent([
    [0.12, 0.18], [0.24, 0.16], [0.30, 0.24], [0.27, 0.42], 
    [0.22, 0.50], [0.18, 0.45], [0.12, 0.35], [0.10, 0.25]
  ], '#388E3C', '#80CBC4');

  // South America
  drawContinent([
    [0.24, 0.50], [0.34, 0.54], [0.32, 0.72], [0.27, 0.86], 
    [0.24, 0.72], [0.21, 0.56]
  ], '#2E7D32', '#80CBC4');

  // Eurasia (Europe + Asia)
  drawContinent([
    [0.45, 0.18], [0.65, 0.14], [0.85, 0.20], [0.88, 0.38], 
    [0.78, 0.46], [0.68, 0.42], [0.55, 0.38], [0.46, 0.30]
  ], '#4CAF50', '#80CBC4');

  // Africa + Sahara desert
  drawContinent([
    [0.46, 0.36], [0.58, 0.35], [0.62, 0.52], [0.56, 0.72], 
    [0.48, 0.65], [0.44, 0.48]
  ], '#558B2F', '#80CBC4');

  // Sahara Desert overlay
  ctx.fillStyle = '#D4A373';
  ctx.beginPath();
  ctx.ellipse(0.51 * w, 0.41 * h, 0.05 * w, 0.04 * h, 0, 0, Math.PI * 2);
  ctx.fill();

  // Australia
  drawContinent([
    [0.78, 0.64], [0.88, 0.62], [0.90, 0.74], [0.82, 0.78], [0.77, 0.70]
  ], '#A1887F', '#80CBC4');

  // Polar Ice Caps (Antarctica & Arctic)
  // Arctic
  ctx.fillStyle = '#ECEFF1';
  ctx.beginPath();
  ctx.rect(0, 0, w, h * 0.08);
  ctx.fill();

  // Antarctica
  ctx.beginPath();
  ctx.rect(0, h * 0.88, w, h * 0.12);
  ctx.fill();

  return configureTexture(canvas, renderer);
}

// 6. Procedural Earth Cloud Layer (Transparent atmospheric cyclones)
export function createEarthCloudTexture(renderer?: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size / 2;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Swirling white clouds with varying density
  for (let i = 0; i < 60; i++) {
    const cx = Math.random() * canvas.width;
    const cy = canvas.height * 0.15 + Math.random() * (canvas.height * 0.7);
    const rad = 20 + Math.random() * 65;

    const g = ctx.createRadialGradient(cx, cy, 5, cx, cy, rad);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    g.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rad * 1.5, rad * 0.7, (Math.random() - 0.5) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Spiral Cyclone Storm
  const drawCyclone = (x: number, y: number) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let t = 0; t < 12; t += 0.2) {
      const r = t * 3.5;
      const nx = x + Math.cos(t) * r;
      const ny = y + Math.sin(t) * r;
      if (t === 0) ctx.moveTo(nx, ny);
      else ctx.lineTo(nx, ny);
    }
    ctx.stroke();
  };

  drawCyclone(canvas.width * 0.32, canvas.height * 0.35);
  drawCyclone(canvas.width * 0.76, canvas.height * 0.48);

  return configureTexture(canvas, renderer);
}

// 7. Procedural Moon Surface (Lunar maria & craters)
export function createMoonTexture(renderer?: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size / 2;
  const ctx = canvas.getContext('2d')!;

  // Bright lunar highland anorthosite base
  ctx.fillStyle = '#CFD8DC';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Basaltic dark lunar maria (seas: Sea of Tranquility, Ocean of Storms)
  const maria = [
    { x: canvas.width * 0.42, y: canvas.height * 0.45, rx: 75, ry: 50 }, // Mare Tranquillitatis
    { x: canvas.width * 0.32, y: canvas.height * 0.38, rx: 110, ry: 70 }, // Oceanus Procellarum
    { x: canvas.width * 0.38, y: canvas.height * 0.30, rx: 65, ry: 45 }, // Mare Imbrium
    { x: canvas.width * 0.52, y: canvas.height * 0.40, rx: 45, ry: 35 }, // Mare Serenitatis
    { x: canvas.width * 0.58, y: canvas.height * 0.52, rx: 50, ry: 40 }, // Mare Fecunditatis
  ];

  for (const m of maria) {
    const mg = ctx.createRadialGradient(m.x, m.y, 10, m.x, m.y, Math.max(m.rx, m.ry));
    mg.addColorStop(0, '#546E7A');
    mg.addColorStop(0.7, '#607D8B');
    mg.addColorStop(1, 'rgba(144, 164, 174, 0)');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.ellipse(m.x, m.y, m.rx, m.ry, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Prominent impact crater Tycho with ray system in South
  const tychoX = canvas.width * 0.45;
  const tychoY = canvas.height * 0.78;
  const tychoR = 20;

  // Tycho rays
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.8;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) {
    ctx.beginPath();
    ctx.moveTo(tychoX, tychoY);
    ctx.lineTo(tychoX + Math.cos(a) * 160, tychoY + Math.sin(a) * 160);
    ctx.stroke();
  }

  // Tycho crater rim
  const tychoGrad = ctx.createRadialGradient(tychoX, tychoY, 2, tychoX, tychoY, tychoR);
  tychoGrad.addColorStop(0, '#37474F');
  tychoGrad.addColorStop(0.7, '#CFD8DC');
  tychoGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = tychoGrad;
  ctx.beginPath();
  ctx.arc(tychoX, tychoY, tychoR, 0, Math.PI * 2);
  ctx.fill();

  // Fine crater noise
  for (let i = 0; i < 110; i++) {
    const cx = Math.random() * canvas.width;
    const cy = Math.random() * canvas.height;
    const cr = 2 + Math.random() * 8;
    ctx.fillStyle = 'rgba(69, 90, 100, 0.5)';
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  return configureTexture(canvas, renderer);
}

// 8. Procedural Planetary Internal Core Texture (for structural layers)
export function createInternalCoreTexture(coreColor: string, mantleColor: string): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const center = size / 2;
  const grad = ctx.createRadialGradient(center, center, 10, center, center, center);
  grad.addColorStop(0, '#FFFFFF'); // Hot center
  grad.addColorStop(0.3, coreColor);
  grad.addColorStop(0.7, mantleColor);
  grad.addColorStop(0.95, '#3E2723'); // Crust line
  grad.addColorStop(1, '#212121');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Concentric geological demarcation rings
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center, center, size * 0.22, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(center, center, size * 0.42, 0, Math.PI * 2);
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}
