import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';

// Types
interface TelemetryPoint {
  id: string;
  registrationId: string;
  boatName: string;
  sailNumber: string;
  skipperName: string;
  clubName: string;
  latitude: number;
  longitude: number;
  heading: number;
  sog: number;
  cog: number;
  timestamp: Date;
}

interface RaceCourseMark {
  id: string;
  letter: string;
  type: 'windward' | 'leeward' | 'gate_left' | 'gate_right' | 'finish';
  latitude: number;
  longitude: number;
}

interface RegattaMapConfig {
  centerLat: number;
  centerLon: number;
  zoom: number;
  courseMarks: RaceCourseMark[];
  startLine: {
    committeeBoatLat: number;
    committeeBoatLon: number;
    pinBoatLat: number;
    pinBoatLon: number;
  };
}

// Mock regatta configuration
const MOCK_REGATTA_CONFIG: RegattaMapConfig = {
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

// Mock boat data
const MOCK_BOATS = [
  { id: 'b1', registrationId: 'r1', boatName: 'Siren', sailNumber: 'ITA-12345', skipperName: 'Marco Rossi', clubName: 'Yacht Club Italiano', latitude: 41.1400, longitude: 9.5720, heading: 180, sog: 6.5, cog: 175 },
  { id: 'b2', registrationId: 'r2', boatName: 'Aurora', sailNumber: 'ITA-67890', skipperName: 'Giulia Bianchi', clubName: 'Circolo Vela Napoli', latitude: 41.1380, longitude: 9.5700, heading: 200, sog: 7.2, cog: 195 },
  { id: 'b3', registrationId: 'r3', boatName: 'Tsunami', sailNumber: 'ITA-11111', skipperName: 'Luca Verdi', clubName: 'Yacht Club Italiano', latitude: 41.1420, longitude: 9.5740, heading: 160, sog: 5.8, cog: 155 },
  { id: 'b4', registrationId: 'r4', boatName: 'Bora', sailNumber: 'ITA-22222', skipperName: 'Anna Ferrari', clubName: 'Circolo Vela Genova', latitude: 41.1360, longitude: 9.5760, heading: 140, sog: 8.1, cog: 135 },
  { id: 'b5', registrationId: 'r5', boatName: 'Maestrale', sailNumber: 'ITA-33333', skipperName: 'Paolo Russo', clubName: 'Yacht Club Italiano', latitude: 41.1440, longitude: 9.5700, heading: 220, sog: 6.0, cog: 215 },
];

// Boat color palette for map markers
const BOAT_COLORS = [
  '#ef4444', // red-500
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
];

function getBoatColor(index: number): string {
  return BOAT_COLORS[index % BOAT_COLORS.length];
}

// Custom boat marker icon
function createBoatIcon(color: string, heading: number): L.Icon<any> {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
      <g transform="rotate(${heading}, 12, 18)">
        <path d="M12 2 L20 32 Q12 36 4 32 Z" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="12" cy="18" r="3" fill="white" opacity="0.5"/>
      </g>
    </svg>`;

  return L.divIcon({
    html: `<div style="background-image: url('data:image/svg+xml;base64,${btoa(svg)}'); width: 24px; height: 36px; background-size: contain; background-repeat: no-repeat;"></div>`,
    iconSize: [24, 36],
    iconAnchor: [12, 18],
    className: '',
  });
}

// Course mark marker icon
function createMarkIcon(type: string): L.Icon<any> {
  const colors: Record<string, string> = {
    windward: '#ef4444',
    leeward: '#3b82f6',
    gate_left: '#10b981',
    gate_right: '#f59e0b',
    finish: '#8b5cf6',
  };

  const color = colors[type] || '#6b7280';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="8" fill="${color}" stroke="white" stroke-width="2"/>
    </svg>`;

  return L.divIcon({
    html: `<div style="background-image: url('data:image/svg+xml;base64,${btoa(svg)}'); width: 20px; height: 20px; background-size: contain; background-repeat: no-repeat;"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    className: '',
  });
}

// RegattaMapPage component
const RegattaMapPage: React.FC = () => {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const boatPositionsRef = useRef<Record<string, TelemetryPoint>>({});
  const [selectedBoatId, setSelectedBoatId] = useState<string | null>(null);
  const [isLiveTracking, setIsLiveTracking] = useState(true);

  // Wind state (direction in degrees, speed in knots)
  const [windDirection, setWindDirection] = useState(180);
  const [windSpeed, setWindSpeed] = useState(12);

  // Initialize map and markers
  useEffect(() => {
    const mapEl = document.getElementById('regatta-map');
    if (!mapEl || mapRef.current) return;

    const map = L.map(mapEl).setView([MOCK_REGATTA_CONFIG.centerLat, MOCK_REGATTA_CONFIG.centerLon], MOCK_REGATTA_CONFIG.zoom);
    mapRef.current = map;

    // Add sea-colored tile layer (CartoDB Dark Matter for ocean-like appearance)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    // Add course marks to the map
    MOCK_REGATTA_CONFIG.courseMarks.forEach((mark, index) => {
      const icon = createMarkIcon(mark.type);
      const marker = L.marker([mark.latitude, mark.longitude], { icon })
        .bindPopup(`<b>Mark ${mark.letter}</b><br>Type: ${mark.type}`)
        .addTo(map);
      markersRef.current.set(`mark-${index}`, marker);
    });

    // Add start line to the map
    const sl = MOCK_REGATTA_CONFIG.startLine;
    L.polyline(
      [[sl.committeeBoatLat, sl.committeeBoatLon], [sl.pinBoatLat, sl.pinBoatLon]],
      { color: '#fbbf24', weight: 3, dashArray: '10, 10' }
    ).addTo(map).bindPopup('<b>Start Line</b>');

    // Add boat markers with click handlers to update selected boat state
    MOCK_BOATS.forEach((boat, index) => {
      const color = getBoatColor(index);
      const icon = createBoatIcon(color, boat.heading);
      const marker = L.marker([boat.latitude, boat.longitude], { icon })
        .bindPopup(`<b>${boat.boatName}</b><br>Sail: ${boat.sailNumber}<br>Skipper: ${boat.skipperName}`)
        .addTo(map);

      // Add click handler to select this boat and update the details panel
      marker.on('click', () => {
        setSelectedBoatId(boat.id);
        map.setView([boat.latitude, boat.longitude], Math.max(map.getZoom(), 15));
      });

      markersRef.current.set(boat.id, marker);

      // Store initial position
      boatPositionsRef.current[boat.id] = { ...boat, timestamp: new Date() };
    });

    // Invalidate size after content is added (fixes map rendering issues)
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 100);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Simulate real-time GPS tracking updates and wind changes
  useEffect(() => {
    if (!isLiveTracking) return;

    const interval = setInterval(() => {
      setWindDirection((prevWindDir) => Math.max(0, Math.min(360, prevWindDir + (Math.random() - 0.5) * 20)));
      setWindSpeed((prevWindSpd) => Math.max(1, Math.min(40, prevWindSpd + (Math.random() - 0.5) * 4)));

      const currentWindDir = windDirection;
      const currentWindSpd = windSpeed;

      MOCK_BOATS.forEach((boat, index) => {
        const currentPos = boatPositionsRef.current[boat.id];
        if (!currentPos) return;

        // Calculate apparent wind angle (angle between boat heading and wind direction)
        let windAngle = ((currentWindDir - currentPos.heading + 360) % 360);
        const isRunningBeforeTheWind = windAngle > 140 && windAngle < 220;

        // Boat speed scales with wind strength (polynomial relationship: stronger winds = much more speed)
        const windSpeedFactor = Math.pow(currentWindSpd / 10, 1.5);
        const baseSpeed = isRunningBeforeTheWind ? 7 : 4.5;
        const maxSpeed = isRunningBeforeTheWind ? 12 : 8;
        const targetSpeed = Math.min(maxSpeed, baseSpeed * windSpeedFactor + (Math.random() - 0.5) * 1.5);

        // Heading adjusts toward wind direction with some randomness
        let headingAdjustment = 0;
        if (!isRunningBeforeTheWind) {
          const targetHeading = currentWindDir + (Math.random() > 0.5 ? 45 : -45);
          headingAdjustment = ((targetHeading - currentPos.heading + 180) % 360) - 90;
        }

        // Course over ground follows heading with slight leeway angle (boats slip sideways)
        const leewayAngle = isRunningBeforeTheWind ? 5 : 8;
        const cogDirection = currentPos.heading + (Math.random() > 0.5 ? leewayAngle : -leewayAngle);

        // Movement direction: boats move forward along their heading, with slight drift from wind
        const headingRad = (currentPos.heading - 90) * (Math.PI / 180);
        const speedFactor = 0.00025 * targetSpeed;
        const newLat = Math.max(41.13, Math.min(41.15, currentPos.latitude + speedFactor * Math.cos(headingRad)));
        const newLon = Math.max(9.565, Math.min(9.582, currentPos.longitude + speedFactor * Math.sin(headingRad)));

        // Update position with heading and speed variations
        const updatedBoat: TelemetryPoint = {
          ...currentPos,
          latitude: newLat,
          longitude: newLon,
          heading: Math.max(0, Math.min(360, currentPos.heading + (Math.random() - 0.5) * 4)),
          sog: targetSpeed,
          cog: cogDirection,
          timestamp: new Date(),
        };

        boatPositionsRef.current[boat.id] = updatedBoat;

        // Update marker position
        const marker = markersRef.current.get(boat.id);
        if (marker) {
          const color = getBoatColor(index);
          const icon = createBoatIcon(color, updatedBoat.heading);
          marker.setIcon(icon);
          marker.setLatLng([updatedBoat.latitude, updatedBoat.longitude]);
          marker.setPopupContent(
            `<b>${boat.boatName}</b><br>Sail: ${boat.sailNumber}<br>Speed: ${updatedBoat.sog.toFixed(1)} kn<br>Heading: ${Math.round(updatedBoat.heading)}°`
          );
        }

        // Update selected boat info panel if this is the selected boat
        if (selectedBoatId === boat.id) {
          setSelectedBoatId(null);
          setTimeout(() => setSelectedBoatId(boat.id), 10);
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isLiveTracking, selectedBoatId, windDirection, windSpeed]);

  // Handle boat selection from sidebar
  const handleSelectBoat = useCallback((boatId: string) => {
    setSelectedBoatId(boatId === selectedBoatId ? null : boatId);
  }, [selectedBoatId]);

  // Get selected boat data
  const selectedBoatData = selectedBoatId ? boatPositionsRef.current[selectedBoatId] : null;

  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-cyan-400">{t('mapPage.title')}</h1>
            <p className="text-xs text-slate-400">{t('mapPage.realTimeGpsTracking')}</p>
          </div>
          <nav className="flex gap-4 items-center">
            <button
              onClick={() => setIsLiveTracking(!isLiveTracking)}
              className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                isLiveTracking ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-600 hover:bg-slate-700'
              }`}
            >
              {isLiveTracking ? t('mapPage.liveTracking') : t('mapPage.paused')}
            </button>
            <Link to="/dashboard" className="text-sm hover:text-cyan-400 transition-colors">{t('dashboard.title')}</Link>
            <button className="bg-red-600 px-3 py-1 rounded text-sm hover:bg-red-700">{t('common.logout')}</button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ height: 'calc(100vh - 80px)' }}>
        {/* Map Container */}
        <div className="lg:col-span-3 bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
          <div id="regatta-map" className="w-full h-full min-h-[400px]" />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-3">
          {/* Boat List - takes 2/5 of sidebar height */}
          <section className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden flex flex-col" style={{ flex: '2', minHeight: 0 }}>
            <div className="p-3 bg-slate-700/50 border-b border-slate-600">
              <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">{t('mapPage.boats').replace('{count}', String(MOCK_BOATS.length))}</h2>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {MOCK_BOATS.map((boat, index) => (
                <button
                  key={boat.id}
                  onClick={() => handleSelectBoat(boat.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedBoatId === boat.id
                      ? 'bg-cyan-500/20 border-cyan-400 shadow-md'
                      : 'bg-slate-700/50 border-transparent hover:bg-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getBoatColor(index) }}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{boat.boatName}</p>
                      <p className="text-xs text-slate-400 truncate">{boat.sailNumber} · {boat.clubName}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Selected Boat Info - takes 1/5 of sidebar height */}
          <section className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden flex flex-col" style={{ flex: '1', minHeight: 0 }}>
            <div className="p-3 bg-slate-700/50 border-b border-slate-600">
              <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">{t('mapPage.boatDetails')}</h2>
            </div>
            {selectedBoatData ? (
              <div className="p-3 space-y-3 overflow-y-auto flex-1">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{t('mapPage.speed')}</p>
                  <p className="font-bold text-white">{selectedBoatData.boatName}</p>
                  <p className="text-sm text-slate-300">{selectedBoatData.sailNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{t('mapPage.heading')}</p>
                  <p className="font-semibold text-white">{selectedBoatData.skipperName}</p>
                  <p className="text-sm text-slate-300">{selectedBoatData.clubName}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-700/50 p-2 rounded-lg">
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{t('mapPage.speed')}</p>
                    <p className="font-bold text-cyan-400">{selectedBoatData.sog.toFixed(1)} kn</p>
                  </div>
                  <div className="bg-slate-700/50 p-2 rounded-lg">
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{t('mapPage.heading')}</p>
                    <p className="font-bold text-cyan-400">{Math.round(selectedBoatData.heading)}°</p>
                  </div>
                </div>
                <div className="bg-slate-700/50 p-2 rounded-lg">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{t('mapPage.position')}</p>
                  <p className="font-mono text-sm text-white">{selectedBoatData.latitude.toFixed(6)}, {selectedBoatData.longitude.toFixed(6)}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full p-4">
                <p className="text-slate-500 text-sm text-center">{t('mapPage.selectABoaToViewDetails')}</p>
              </div>
            )}
          </section>

          {/* Wind Indicator - takes 2/5 of sidebar height */}
          <section className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden flex flex-col" style={{ flex: '2', minHeight: 0 }}>
            <div className="p-3 bg-slate-700/50 border-b border-slate-600">
              <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">{t('mapPage.windIndicator')}</h2>
            </div>
            <div className="flex flex-col items-center justify-center p-3 gap-2 overflow-y-auto flex-1">
              {/* Wind Compass Rose */}
              <div className="relative w-full aspect-square max-w-[160px]">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  {/* Outer circle - properly centered with room for stroke */}
                  <circle cx="100" cy="100" r="95" fill="none" stroke="#475569" strokeWidth="2" />

                  {/* Compass directions */}
                  {['N', 'E', 'S', 'W'].map((dir, i) => {
                    const angles = [0, 90, 180, 270];
                    const rad = (angles[i] - 90) * (Math.PI / 180);
                    const cx = 100 + 85 * Math.cos(rad);
                    const cy = 100 + 85 * Math.sin(rad);
                    return (
                      <text key={dir} x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#94a3b8" fontSize="12" fontWeight="bold">
                        {dir}
                      </text>
                    );
                  })}

                  {/* Tick marks */}
                  {[...Array(36)].map((_, i) => {
                    const angle = (i * 10 - 90) * (Math.PI / 180);
                    const innerR = i % 9 === 0 ? 75 : 82;
                    const outerR = 90;
                    return (
                      <line key={i} x1={100 + innerR * Math.cos(angle)} y1={100 + innerR * Math.sin(angle)} x2={100 + outerR * Math.cos(angle)} y2={100 + outerR * Math.sin(angle)} stroke="#475569" strokeWidth={i % 9 === 0 ? 2 : 1} />
                    );
                  })}

                  {/* Wind direction arrow - pointing TO where wind is going */}
                  <g transform={`rotate(${windDirection}, 100, 100)`}>
                    {/* Arrow shaft */}
                    <line x1="100" y1="100" x2="100" y2={35 + windSpeed * 0.8} stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
                    {/* Arrow head */}
                    <polygon points="100,30 94,42 106,42" fill="#22d3ee" />
                  </g>

                  {/* Center dot */}
                  <circle cx="100" cy="100" r="5" fill="#22d3ee" />

                  {/* Wind speed bar (bottom) */}
                  <rect x="60" y="145" width="80" height="8" rx="4" fill="#334155" />
                  <rect x="60" y="145" width={`${(windSpeed / 40) * 80}`} height="8" rx="4" fill={windSpeed > 25 ? '#ef4444' : windSpeed > 15 ? '#f59e0b' : '#22d3ee'} />
                </svg>
              </div>

              {/* Wind speed readout */}
              <div className="text-center">
                <p className="text-3xl font-bold text-cyan-400">{windSpeed.toFixed(1)}</p>
                <p className="text-xs text-slate-400 uppercase tracking-wide">{t('mapPage.knots')}</p>
              </div>

              {/* Wind direction readout */}
              <div className="text-center">
                <p className="text-xl font-bold text-white">{Math.round(windDirection)}°</p>
                <p className="text-xs text-slate-400 uppercase tracking-wide">{t('mapPage.direction')}</p>
              </div>

              {/* Beaufort scale indicator */}
              <div className="w-full bg-slate-700/50 rounded-lg p-2">
                <p className="text-xs text-center text-slate-300 font-semibold">{t('mapPage.beaufortScale')}</p>
                <div className="flex items-center gap-1 mt-1">
                  {[...Array(13)].map((_, i) => (
                    <div key={i} className={`h-2 flex-1 rounded-sm ${windSpeed >= i * 2 ? (windSpeed > 25 ? 'bg-red-500' : windSpeed > 15 ? 'bg-yellow-500' : 'bg-cyan-500') : 'bg-slate-600'}`} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default RegattaMapPage;