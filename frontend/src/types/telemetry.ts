// Boat telemetry data for GPS tracking on regatta map

export interface TelemetryPoint {
  id: string;
  registrationId: string;
  boatName: string;
  sailNumber: string;
  skipperName: string;
  clubName: string;
  latitude: number;
  longitude: number;
  heading: number;
  sog: number; // speed over ground in knots
  cog: number; // course over ground in degrees
  timestamp: Date;
}

export interface RaceCourseMark {
  id: string;
  letter: string;
  type: 'windward' | 'leeward' | 'gate_left' | 'gate_right' | 'finish';
  latitude: number;
  longitude: number;
}

export interface RaceStartLine {
  committeeBoatLat: number;
  committeeBoatLon: number;
  pinBoatLat: number;
  pinBoatLon: number;
}

export interface RegattaMapConfig {
  centerLat: number;
  centerLon: number;
  zoom: number;
  courseMarks: RaceCourseMark[];
  startLine: RaceStartLine;
}

// Mock regatta data for demonstration
export const MOCK_REGATTA_CONFIG: RegattaMapConfig = {
  centerLat: 41.1350,
  centerLon: 9.5680,
  zoom: 14,
  courseMarks: [
    { id: 'm1', letter: 'W', type: 'windward', latitude: 41.1450, longitude: 9.5680 },
    { id: 'm2', letter: 'L', type: 'leeward', latitude: 41.1350, longitude: 9.5780 },
    { id: 'm3', letter: 'F', type: 'finish', latitude: 41.1350, longitude: 9.5680 },
  ],
  startLine: {
    committeeBoatLat: 41.1450,
    committeeBoatLon: 9.5680,
    pinBoatLat: 41.1350,
    pinBoatLon: 9.5780,
  },
};

// Mock boat data for demonstration
export const MOCK_BOATS = [
  { id: 'b1', registrationId: 'r1', boatName: 'Siren', sailNumber: 'ITA-12345', skipperName: 'Marco Rossi', clubName: 'Yacht Club Italiano', latitude: 41.1400, longitude: 9.5720, heading: 180, sog: 6.5, cog: 175 },
  { id: 'b2', registrationId: 'r2', boatName: 'Aurora', sailNumber: 'ITA-67890', skipperName: 'Giulia Bianchi', clubName: 'Circolo Vela Napoli', latitude: 41.1380, longitude: 9.5700, heading: 200, sog: 7.2, cog: 195 },
  { id: 'b3', registrationId: 'r3', boatName: 'Tsunami', sailNumber: 'ITA-11111', skipperName: 'Luca Verdi', clubName: 'Yacht Club Italiano', latitude: 41.1420, longitude: 9.5740, heading: 160, sog: 5.8, cog: 155 },
  { id: 'b4', registrationId: 'r4', boatName: 'Bora', sailNumber: 'ITA-22222', skipperName: 'Anna Ferrari', clubName: 'Circolo Vela Genova', latitude: 41.1360, longitude: 9.5760, heading: 140, sog: 8.1, cog: 135 },
  { id: 'b5', registrationId: 'r5', boatName: 'Maestrale', sailNumber: 'ITA-33333', skipperName: 'Paolo Russo', clubName: 'Yacht Club Italiano', latitude: 41.1440, longitude: 9.5700, heading: 220, sog: 6.0, cog: 215 },
];

// Boat color palette for map markers
export const BOAT_COLORS = [
  '#ef4444', // red-500
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
];

export function getBoatColor(index: number): string {
  return BOAT_COLORS[index % BOAT_COLORS.length];
}