export type BodyId = 'sun' | 'mercury' | 'venus' | 'earth' | 'moon' | 'all';

export interface PlanetaryLayer {
  name: string;
  depth: string;
  composition: string;
  temperature: string;
  color: string;
  description: string;
}

export interface SpaceMission {
  name: string;
  agency: string;
  year: string;
  achievement: string;
}

export interface CelestialBodyData {
  id: BodyId;
  name: string;
  latinName: string;
  category: 'Estrela' | 'Planeta Rochoso' | 'Satélite Natural';
  color: string;
  accentColor: string;
  glowColor: string;
  radiusKm: number;
  relativeSize: number; // for visual mode relative scale
  orbitRadiusAU: number; // Astronomical Units
  visualOrbitRadius: number; // in 3D scene units
  orbitPeriodDays: number; // days to orbit Sun (or Earth for Moon)
  rotationPeriodHours: number; // hours per axial rotation (negative = retrograde)
  axialTiltDeg: number;
  meanTemperatureC: number;
  temperatureRange: string;
  surfaceGravity: string;
  massKg: string;
  escapeVelocityKmS: string;
  atmosphericPressure: string;
  atmosphereComposition: { name: string; percentage: number }[];
  summary: string;
  narrativeDescription: string;
  fascinatingFacts: string[];
  layers: PlanetaryLayer[];
  missions: SpaceMission[];
  tags: string[];
}
