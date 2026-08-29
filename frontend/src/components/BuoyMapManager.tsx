import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';

// Types for buoy/mark management
interface Buoy {
  id?: string;
  regatta_id: string;
  race_id?: string | null;
  mark_letter: string;
  mark_type: 'windward' | 'leeward' | 'gate_left' | 'gate_right' | 'finish';
  latitude: number;
  longitude: number;
  is_robotic: boolean;
  device_id?: string | null;
}

interface BuoyMapManagerProps {
  regattaId: string;
  raceId?: string | null;
  centerLat: number;
  centerLon: number;
  zoom?: number;
  onSave?: (buoys: Buoy[]) => void;
  initialBuoys?: Buoy[];
  readOnly?: boolean;
}

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Helper per ottenere gli header con il token JWT
const getAuthHeaders = (includeContentType: boolean = true): Record<string, string> => {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('jwt');
  const headers: Record<string, string> = {};

  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// Buoy type colors for map markers
const BUOY_COLORS: Record<string, string> = {
  windward: '#ef4444',    // red-500
  leeward: '#3b82f6',     // blue-500
  gate_left: '#10b981',   // emerald-500
  gate_right: '#f59e0b',  // amber-500
  finish: '#8b5cf6',      // violet-500
};

// Buoy type labels for display
const BUOY_LABELS: Record<string, string> = {
  windward: 'W',
  leeward: 'L',
  gate_left: 'GL',
  gate_right: 'GR',
  finish: 'F',
};

// Letter sequence for automatic buoy naming (A-Z)
const LETTER_SEQUENCE = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

// Create custom buoy marker icon
function createBuoyIcon(type: string, labelText: string, isSelected: boolean = false): L.Icon<any> {
  const color = BUOY_COLORS[type] || '#6b7280';
  const size = isSelected ? 30 : 24;
  const label = labelText || BUOY_LABELS[type] || '?';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="${color}" stroke="${isSelected ? '#38bdf8' : 'white'}" stroke-width="${isSelected ? '3' : '2'}"/>
      <text x="${size / 2}" y="${size / 2 + 4}" text-anchor="middle" dominantBaseline="central" fill="white" font-size="${size / 3}" font-weight="bold">${label}</text>
    </svg>`;

  return L.divIcon({
    html: `<div style="background-image: url('data:image/svg+xml;base64,${btoa(svg)}'); width: ${size}px; height: ${size}px; background-size: contain; background-repeat: no-repeat;"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    className: '',
  });
}

const BuoyMapManager: React.FC<BuoyMapManagerProps> = ({
  regattaId,
  raceId,
  centerLat,
  centerLon,
  zoom = 14,
  onSave,
  initialBuoys = [],
  readOnly = false,
}) => {
  const { t } = useTranslation();
  
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const tempMarkerRef = useRef<L.Marker | null>(null);
  const finishLineRef = useRef<L.Polyline[]>([]);

  // State
  const [buoys, setBuoys] = useState<Buoy[]>(initialBuoys);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isPlacingMode, setIsPlacingMode] = useState(false);
  const [placingType, setPlacingType] = useState<'windward' | 'leeward' | 'gate_left' | 'gate_right' | 'finish'>('windward');
  const [nextLetterIndex, setNextLetterIndex] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const getBuoyKey = (buoy: Buoy, index: number) => buoy.id || `buoy-${buoy.mark_letter}-${index}`;

  // Fetch existing buoys on mount
  useEffect(() => {
    if (initialBuoys.length > 0) {
      setBuoys(initialBuoys);
      updateNextLetterIndex(initialBuoys);
      return;
    }

    const fetchBuoys = async () => {
      try {
        const url = raceId
          ? `${API_BASE_URL}/regattas/${regattaId}/marks?race_id=${raceId}`
          : `${API_BASE_URL}/regattas/${regattaId}/marks`;

        const response = await fetch(url, {
          headers: getAuthHeaders(false),
        });
        if (response.ok) {
          const data = await response.json();
          const loadedMarks: Buoy[] = data.marks || [];
          setBuoys(loadedMarks);
          updateNextLetterIndex(loadedMarks);
        }
      } catch (error) {
        console.error('Failed to fetch buoys:', error);
      }
    };

    fetchBuoys();
  }, [regattaId, raceId, initialBuoys]);

  const updateNextLetterIndex = (currentBuoys: Buoy[]) => {
    const existingLetters = new Set(currentBuoys.map((b) => b.mark_letter));
    let index = 0;
    while (existingLetters.has(LETTER_SEQUENCE[index])) {
      index++;
    }
    setNextLetterIndex(index);
  };

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map('buoy-map').setView([centerLat, centerLon], zoom);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [centerLat, centerLon, zoom]);

  // Universal Buoy Delete Function
  const deleteBuoy = useCallback(async (buoyToDelete: Buoy, index: number) => {
    if (readOnly) return;

    if (buoyToDelete.id && !buoyToDelete.id.startsWith('temp-')) {
      try {
        const response = await fetch(`${API_BASE_URL}/marks/${buoyToDelete.id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(false),
        });
        if (!response.ok) {
          console.warn(`DELETE /marks/${buoyToDelete.id} status: ${response.status}`);
        }
      } catch (error) {
        console.error('Failed to delete buoy on backend:', error);
      }
    }

    setBuoys((prevBuoys) => {
      const updated = prevBuoys.filter((b, i) => {
        if (buoyToDelete.id && b.id) return b.id !== buoyToDelete.id;
        return i !== index;
      });
      updateNextLetterIndex(updated);
      if (onSave) onSave(updated);
      return updated;
    });

    setSelectedKey(null);
  }, [readOnly, onSave]);

  // Helper to translate buoy type keys
  const translateBuoyType = (type: string): string => {
    return t(`buoyMapManager.${type}`);
  };

  // Render Markers & SOLO linea Finish
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Reset elementi precedenti
    finishLineRef.current.forEach((line) => line.remove());
    finishLineRef.current = [];

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    // 1. Disegna i Marker
    buoys.forEach((buoy, index) => {
      const currentKey = getBuoyKey(buoy, index);
      const isSelected = selectedKey === currentKey;
      const icon = createBuoyIcon(buoy.mark_type, buoy.mark_letter, isSelected);

      const marker = L.marker([buoy.latitude, buoy.longitude], { icon }).addTo(map);

      // Create a closure to capture the current buoy's values for popup
      const buoyLetter = buoy.mark_letter;
      const buoyType = buoy.mark_type;
      const buoyLat = buoy.latitude.toFixed(5);
      const buoyLng = buoy.longitude.toFixed(5);
      
      const popupDiv = document.createElement('div');
      popupDiv.innerHTML = `
        <div style="font-family: sans-serif; font-size: 12px; color: #1e293b;">
          <b>${t('buoyMapManager.buoy')} ${buoyLetter}</b> (${translateBuoyType(buoyType)})<br/>
          ${t('buoyMapManager.latitude')}: ${buoyLat}<br/>
          ${t('buoyMapManager.longitude')}: ${buoyLng}<br/>
        </div>
      `;

      if (!readOnly) {
        const btnDelete = document.createElement('button');
        btnDelete.innerText = `🗑️ ${t('buoyMapManager.deleteBuoy')}`;
        btnDelete.style.marginTop = '6px';
        btnDelete.style.padding = '4px 8px';
        btnDelete.style.backgroundColor = '#ef4444';
        btnDelete.style.color = '#ffffff';
        btnDelete.style.border = 'none';
        btnDelete.style.borderRadius = '4px';
        btnDelete.style.cursor = 'pointer';
        btnDelete.style.fontSize = '11px';
        btnDelete.style.fontWeight = 'bold';
        btnDelete.onclick = () => {
          map.closePopup();
          deleteBuoy(buoy, index);
        };
        popupDiv.appendChild(btnDelete);
      }

      marker.bindPopup(popupDiv);

      marker.on('click', () => {
        if (!readOnly && !isPlacingMode) {
          setSelectedKey(currentKey);
        }
      });

      markersRef.current.set(currentKey, marker);
    });

    // 2. Disegna SOLO la linea tra le prime due boe di tipo Finish
    const finishes = buoys.filter((b) => b.mark_type === 'finish');
    if (finishes.length >= 2) {
      const finishLine = L.polyline(
        [
          [finishes[0].latitude, finishes[0].longitude],
          [finishes[1].latitude, finishes[1].longitude],
        ],
        {
          color: '#8b5cf6', // Viola Finish
          weight: 3.5,
          dashArray: '6, 6',
          opacity: 0.95,
        }
      ).addTo(map);
      finishLineRef.current.push(finishLine);
    }

    setTimeout(() => map.invalidateSize(), 100);
  }, [buoys, selectedKey, readOnly, isPlacingMode, deleteBuoy]);

  // Save single buoy to Backend
  const saveBuoyToBackend = async (buoy: Buoy): Promise<Buoy | null> => {
    try {
      let url: string;
      let method: string;

      if (buoy.id && !buoy.id.startsWith('temp-')) {
        url = `${API_BASE_URL}/marks/${buoy.id}`;
        method = 'PUT';
      } else {
        url = `${API_BASE_URL}/regattas/${buoy.regatta_id}/marks`;
        method = 'POST';
      }

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(true),
        body: JSON.stringify(buoy),
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to save buoy:', error);
    }
    return null;
  };

  // Save All Buoys
  const handleSaveAll = async () => {
    if (readOnly || isSaving) return;
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const savePromises = buoys.map(async (buoy) => {
        const saved = await saveBuoyToBackend(buoy);
        return saved && saved.id ? { ...buoy, id: saved.id } : buoy;
      });

      const updatedBuoys = await Promise.all(savePromises);
      setBuoys(updatedBuoys);

      if (onSave) {
        onSave(updatedBuoys);
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving marks:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Map Click for placing buoys
  const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
    if (!isPlacingMode || readOnly) return;

    const { lat, lng } = e.latlng;

    if (tempMarkerRef.current) {
      tempMarkerRef.current.remove();
      tempMarkerRef.current = null;
    }

    const newBuoy: Buoy = {
      regatta_id: regattaId,
      race_id: raceId || null,
      mark_letter: LETTER_SEQUENCE[nextLetterIndex] || `M${nextLetterIndex}`,
      mark_type: placingType,
      latitude: lat,
      longitude: lng,
      is_robotic: false,
    };

    const updatedBuoys = [...buoys, newBuoy];
    setBuoys(updatedBuoys);
    updateNextLetterIndex(updatedBuoys);

    const handleSave = (finalBuoys: Buoy[]) => {
      if (onSave) onSave(finalBuoys);
    };

    saveBuoyToBackend(newBuoy).then((savedBuoy) => {
      if (savedBuoy && savedBuoy.id) {
        const finalBuoys = updatedBuoys.map((b) =>
          b === newBuoy ? { ...b, id: savedBuoy.id } : b
        );
        setBuoys(finalBuoys);
        handleSave(finalBuoys);
      } else {
        handleSave(updatedBuoys);
      }
    });

    setIsPlacingMode(false);
  }, [isPlacingMode, readOnly, regattaId, raceId, placingType, nextLetterIndex, buoys, onSave]);

  const togglePlacingMode = useCallback((type: 'windward' | 'leeward' | 'gate_left' | 'gate_right' | 'finish') => {
    if (readOnly) return;

    if (isPlacingMode && placingType === type) {
      setIsPlacingMode(false);
    } else {
      setIsPlacingMode(true);
      setPlacingType(type);
    }
  }, [readOnly, isPlacingMode, placingType]);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const handleClick = (e: L.LeafletMouseEvent) => handleMapClick(e);

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [handleMapClick]);

  useEffect(() => {
    if (!mapRef.current || !isPlacingMode) {
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }
      return;
    }

    const container = mapRef.current.getContainer();
    if (container) {
      container.style.cursor = 'crosshair';
    }

    return () => {
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }
      const currentContainer = mapRef.current?.getContainer();
      if (currentContainer) {
        currentContainer.style.cursor = '';
      }
    };
  }, [isPlacingMode]);

  const getBuoyCountByType = (type: string) => buoys.filter((b) => b.mark_type === type).length;

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-3 bg-slate-700/50 border-b border-slate-600 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">
            {t('buoyMapManager.title')} ({buoys.length})
          </h2>
          {saveStatus === 'success' && (
            <span className="text-xs text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
              ✓ {t('buoyMapManager.changesSaved')}
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-500/30">
              ✕ {t('buoyMapManager.saveError')}
            </span>
          )}
        </div>

        {!readOnly && (
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className={`px-4 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1.5 text-white ${
              saveStatus === 'success'
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : isSaving
                ? 'bg-slate-600 cursor-not-allowed opacity-75'
                : 'bg-green-600 hover:bg-green-500 shadow-md hover:shadow-green-600/30 active:scale-95'
            }`}
          >
            {isSaving ? (
              <span>{t('buoyMapManager.saving')}</span>
            ) : saveStatus === 'success' ? (
              <span>✓ {t('buoyMapManager.saved')}</span>
            ) : (
              <span>💾 {t('buoyMapManager.saveAll')}</span>
            )}
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Map Container */}
        <div className="flex-1 relative">
          <div id="buoy-map" className="w-full h-full min-h-[350px]" />

          {isPlacingMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-cyan-600 text-white px-4 py-2 rounded-lg shadow-lg z-[1000] animate-pulse">
              <p className="text-sm font-semibold">{t('buoyMapManager.clickMapToPlaceBuoy', { type: t(`buoyMapManager.${placingType}`) })}</p>
              <button
                onClick={() => setIsPlacingMode(false)}
                className="mt-1 text-xs underline hover:text-cyan-200 block text-center w-full"
              >
                {t('buoyMapManager.cancel')}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Controls */}
        {!readOnly && (
          <div className="w-60 bg-slate-800 border-l border-slate-700 p-3 flex flex-col gap-3 overflow-y-auto">
            {/* Sezione Aggiungi Tipo Boa */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                {t('buoyMapManager.addBuoyType')}
              </h3>
              <div className="flex flex-col gap-1.5">
                {(['windward', 'leeward', 'gate_left', 'gate_right', 'finish'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => togglePlacingMode(type)}
                    className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                      isPlacingMode && placingType === type
                        ? 'bg-cyan-500/30 border-cyan-400 shadow-md'
                        : 'bg-slate-700/50 border-transparent hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: BUOY_COLORS[type] }}
                      />
                      <span className="text-xs text-white">{t(`buoyMapManager.${type}`)}</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {getBuoyCountByType(type)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-700" />

            {/* Sezione Elenco Boe Posizionate con Pulsante Elimina */}
            <div className="flex-1 flex flex-col min-h-0">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                {t('buoyMapManager.placedBuoys')} ({buoys.length})
              </h3>

              {buoys.length === 0 ? (
                <p className="text-xs text-slate-500 italic">{t('buoyMapManager.noBuoysPlaced')}</p>
              ) : (
                <div className="flex flex-col gap-1.5 overflow-y-auto max-h-60 pr-1">
                  {buoys.map((buoy, idx) => {
                    const currentKey = getBuoyKey(buoy, idx);
                    const isSelected = selectedKey === currentKey;
                    return (
                      <div
                        key={currentKey}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
                          isSelected
                            ? 'bg-slate-700 border-cyan-500'
                            : 'bg-slate-900/60 border-slate-700/70 hover:bg-slate-700/50'
                        }`}
                      >
                        <div
                          className="flex items-center gap-2 cursor-pointer flex-1"
                          onClick={() => {
                            setSelectedKey(currentKey);
                            const marker = markersRef.current.get(currentKey);
                            if (marker && mapRef.current) {
                              mapRef.current.panTo([buoy.latitude, buoy.longitude]);
                              marker.openPopup();
                            }
                          }}
                        >
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-white"
                            style={{ backgroundColor: BUOY_COLORS[buoy.mark_type] }}
                          >
                            {buoy.mark_letter}
                          </span>
                          <span className="text-slate-200 font-medium">
                            {t(`buoyMapManager.${buoy.mark_type}`)}
                          </span>
                        </div>

                        {/* Pulsante Cestino */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBuoy(buoy, idx);
                          }}
                          title={t('buoyMapManager.deleteBuoy')}
                          className="p-1 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuoyMapManager;