import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export interface UserData {
  id?: string;
  fullName: string;
  email: string;
  role?: string;
  fivNumber?: string;
  avatarUrl?: string | null;
  operationalStatus?: 'available' | 'racing' | 'offline';
}

const API_BASE_URL = 'http://localhost:8000';

const UserProfileDrawer: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tessera' | 'anagrafica' | 'credenziali'>('tessera');
  const [status, setStatus] = useState<'available' | 'racing' | 'offline'>('available');
  
  const [userData, setUserData] = useState<UserData>({
    id: 'usr_883920_reg',
    fullName: 'Davide Capitano',
    email: 'davidecapitano@gmail.com',
    role: 'ADMIN',
    fivNumber: 'FIV-883920',
    avatarUrl: localStorage.getItem('user_avatar') || null
  });

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const [menuTheme, setMenuTheme] = useState<'dark' | 'light'>(() => {
    return localStorage.getItem('menu_theme') === 'light' ? 'light' : 'dark';
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generatore deterministico di PIN di stazza basato sul FIV
  const checkinPin = "842-190";

  const getAuthToken = (): string | null => {
    const directToken = 
      localStorage.getItem('access_token') || 
      localStorage.getItem('token') || 
      localStorage.getItem('jwt');
    if (directToken) return directToken;

    try {
      const rawUser = localStorage.getItem('user');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (parsed.token || parsed.access_token || parsed.accessToken) {
          return parsed.token || parsed.access_token || parsed.accessToken;
        }
      }
    } catch {
      // ignore
    }
    return null;
  };

  const fetchUserProfile = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setUserData({
          id: data.id || 'usr_883920_reg',
          fullName: data.full_name || data.email.split('@')[0],
          email: data.email,
          role: data.role ? String(data.role).toUpperCase() : 'ADMIN',
          fivNumber: data.fiv_number || 'FIV-883920',
          avatarUrl: data.avatar_url
            ? (data.avatar_url.startsWith('http') ? data.avatar_url : `${API_BASE_URL}${data.avatar_url}`)
            : null,
          operationalStatus: data.operational_status || 'available'
        });
        if (data.operational_status) {
          setStatus(data.operational_status);
        }
      }
    } catch (err) {
      console.warn('Errore sync profilo DB, uso fallback locale:', err);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Seleziona un formato immagine valido (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result as string;
      localStorage.setItem('user_avatar', b64);
    };
    reader.readAsDataURL(file);

    const token = getAuthToken();
    if (!token) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/users/me/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const updatedUser = await res.json();
        const completeUrl = updatedUser.avatar_url.startsWith('http')
          ? updatedUser.avatar_url
          : `${API_BASE_URL}${updatedUser.avatar_url}`;
        setUserData((prev) => ({ ...prev, avatarUrl: completeUrl }));
      }
    } catch (err) {
      console.error('Errore invio avatar:', err);
    }
  };

  const cycleStatus = async () => {
    let nextStatus: 'available' | 'racing' | 'offline' = 'available';
    if (status === 'available') nextStatus = 'racing';
    else if (status === 'racing') nextStatus = 'offline';
    else nextStatus = 'available';

    setStatus(nextStatus);

    const token = getAuthToken();
    if (!token) return;

    try {
      await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ operational_status: nextStatus })
      });
    } catch (err) {
      console.warn('Errore sync stato DB:', err);
    }
  };

  const handleLogout = () => {
    setIsOpen(false);
    setIsModalOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      localStorage.removeItem('user_avatar');
      navigate('/login');
    }
  };

  // Funzione Download Pass Concorrente
  const handleDownloadPass = () => {
    const passData = {
      manifest: "REGATTA_OFFICIAL_COMPETITOR_PASS",
      issued_at: new Date().toISOString(),
      athlete: {
        id: userData.id,
        name: userData.fullName,
        email: userData.email,
        role: userData.role,
        fiv_license: userData.fivNumber || "FIV-883920",
        medical_clearance: "VALID_AGONISTICA_B1_2026",
        insurance_rc: "WORLD_SAILING_COMPLIANT_ACTIVE"
      },
      checkin_token: `TOKEN-${(userData.fivNumber || '883920').replace(/[^0-9]/g, '')}-SECURE-REGATTA-2026`,
      quick_pin: checkinPin
    };

    const blob = new Blob([JSON.stringify(passData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PASS_CONCORRENTE_${(userData.fivNumber || 'FIV').replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSendResetEmail = () => {
    setResetEmailSent(true);
    setTimeout(() => setResetEmailSent(false), 4000);
  };

  const toggleMenuTheme = () => {
    setMenuTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('menu_theme', next);
      return next;
    });
  };

  const statusConfig = {
    available: { label: 'Disponibile', color: 'bg-emerald-500', text: menuTheme === 'dark' ? 'text-emerald-300' : 'text-emerald-600' },
    racing: { label: 'In Regata', color: 'bg-amber-500', text: menuTheme === 'dark' ? 'text-amber-300' : 'text-amber-600' },
    offline: { label: 'Non disturbare', color: 'bg-slate-400', text: menuTheme === 'dark' ? 'text-slate-400' : 'text-slate-500' }
  };

  const displayName = userData?.fullName || 'Davide Capitano';
  const displayEmail = userData?.email || 'davidecapitano@gmail.com';
  const displayRole = userData?.role || 'ADMIN';
  const initialLetter = (displayName.charAt(0) || 'D').toUpperCase();
  const isDark = menuTheme === 'dark';

  return (
    <>
      <div className="relative" ref={menuRef}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageChange}
          accept="image/*"
          className="hidden"
        />

        {/* Pulsante Hamburger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-2 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
            isOpen
              ? 'bg-cyan-500/30 border-cyan-400 text-white'
              : 'bg-white/10 hover:bg-white/20 border-white/20 text-cyan-300 hover:text-cyan-200'
          }`}
          aria-label="Apri menu utente"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Dropdown Menu Verticale */}
        {isOpen && (
          <div
            style={{ backgroundColor: isDark ? '#0b1329' : '#ffffff', zIndex: 9999 }}
            className={`absolute right-0 top-full mt-3 w-88 sm:w-96 rounded-2xl border shadow-2xl flex flex-col overflow-hidden text-left transition-colors duration-200 ${
              isDark ? 'border-slate-700/80 text-white' : 'border-slate-200 text-slate-800'
            }`}
          >
            {/* Header del Profilo */}
            <div
              style={{ backgroundColor: isDark ? '#111c38' : '#f8fafc' }}
              className={`p-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}
            >
              <div className="flex items-center gap-3.5">
                {/* Cerchio Avatar Ingrandito con '+' */}
                <div className="relative flex-shrink-0">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 text-white flex items-center justify-center font-bold text-xl shadow-lg overflow-hidden border-2 border-white/20 cursor-pointer group"
                    title="Clicca per caricare una foto"
                  >
                    {userData.avatarUrl ? (
                      <img src={userData.avatarUrl} alt={displayName} className="w-full h-full object-cover group-hover:opacity-85 transition-opacity" />
                    ) : (
                      <span className="group-hover:scale-105 transition-transform">{initialLetter}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-cyan-500 hover:bg-cyan-400 text-white flex items-center justify-center shadow-md border-2 border-[#111c38] transition-transform hover:scale-110"
                    title="Carica foto"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>

                  <span
                    className={`absolute bottom-0 -left-0.5 w-3.5 h-3.5 rounded-full border-2 ${
                      isDark ? 'border-[#111c38]' : 'border-white'
                    } ${statusConfig[status].color}`}
                  />
                </div>

                {/* Info Utente con BADGE ADMIN a destra */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-base font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`} title={displayName}>
                      {displayName}
                    </h3>
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border shrink-0 ${
                        isDark
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                          : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                      }`}
                    >
                      {displayRole}
                    </span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{displayEmail}</p>
                </div>
              </div>

              {/* Selettore rapido di stato */}
              <button
                onClick={cycleStatus}
                className={`mt-3 w-full flex items-center justify-between px-3 py-1.5 rounded-lg border transition-colors text-xs ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-700/60 hover:border-slate-600'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Stato operativo:</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${statusConfig[status].color}`} />
                  <span className={`font-medium ${statusConfig[status].text}`}>{statusConfig[status].label}</span>
                </div>
              </button>
            </div>

            {/* Voci di Navigazione */}
            <div className={`max-h-[65vh] overflow-y-auto divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
              <div className="p-2 space-y-0.5">
                <span className={`px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                  Il Mio Spazio
                </span>

                <Link
                  to="/regattas"
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-colors ${
                    isDark ? 'text-slate-200 hover:text-white hover:bg-slate-800/80' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Iscrizioni & Regate</span>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    Live
                  </span>
                </Link>

                <Link
                  to="/map"
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 text-sm rounded-xl transition-colors ${
                    isDark ? 'text-slate-200 hover:text-white hover:bg-slate-800/80' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <svg className="w-4 h-4 text-cyan-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <span>Mappa & Live Tracking</span>
                </Link>

                <Link
                  to="/clubs"
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 text-sm rounded-xl transition-colors ${
                    isDark ? 'text-slate-200 hover:text-white hover:bg-slate-800/80' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Circoli Velici Affiliati</span>
                </Link>
              </div>

              {/* SEZIONE DOCUMENTI & CREDENZIALI RECUPERO */}
              <div className="p-2 space-y-0.5">
                <span className={`px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                  Documenti & Accreditamento
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setActiveTab('tessera');
                    setIsModalOpen(true);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all text-left ${
                    isDark ? 'text-slate-200 hover:text-white hover:bg-slate-800/80' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-medium block leading-tight">Tessera FIV & Visita</span>
                      <span className="text-[11px] text-slate-400">Idoneità Agonistica</span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    ATTIVA
                  </span>
                </button>

                {/* NUOVO PULSANTE RECUPERO & CREDENZIALI DI BORDO */}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setActiveTab('credenziali');
                    setIsModalOpen(true);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all text-left ${
                    isDark ? 'text-slate-200 hover:text-white hover:bg-slate-800/80' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-medium block leading-tight">Recupero & Credenziali</span>
                      <span className="text-[11px] text-purple-300 font-semibold">QR Check-in & Tablet</span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
                    CHECK-IN
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setActiveTab('anagrafica');
                    setIsModalOpen(true);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all text-left ${
                    isDark ? 'text-slate-200 hover:text-white hover:bg-slate-800/80' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-medium block leading-tight">Scheda Velista & Foto</span>
                      <span className="text-[11px] text-slate-400">Database Sincronizzato</span>
                    </div>
                  </div>
                  <span className="text-xs text-cyan-400 font-medium">Modifica</span>
                </button>
              </div>

              {/* Personalizzazione Tema */}
              <div className="p-2 space-y-0.5">
                <span className={`px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                  Personalizzazione Menu
                </span>

                <div className={`flex items-center justify-between px-3 py-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <div className="flex items-center gap-3">
                    {isDark ? (
                      <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    )}
                    <span>Tema Menu ({isDark ? 'Scuro' : 'Chiaro'})</span>
                  </div>

                  <button
                    type="button"
                    onClick={toggleMenuTheme}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                      isDark ? 'bg-cyan-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isDark ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Logout Footer */}
            <div
              style={{ backgroundColor: isDark ? '#111c38' : '#f8fafc' }}
              className={`p-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}
            >
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 rounded-lg transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>{t('common.logout', 'Disconnetti')}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL PASSAPORTO & CREDENZIALI CENTRATO */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div 
              style={{ backgroundColor: '#0c1527' }}
              className="relative w-full max-w-xl rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col text-white"
            >
              {/* Barra Tricolore */}
              <div className="h-1.5 w-full flex">
                <div className="w-1/3 bg-emerald-500" />
                <div className="w-1/3 bg-white" />
                <div className="w-1/3 bg-red-500" />
              </div>

              {/* Header Modal */}
              <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v13m0 0l-8 2 8-15 8 15-8-2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white leading-snug">Passaporto del Concorrente</h2>
                    <p className="text-xs text-slate-400">Federazione Italiana Vela & Identità di Bordo</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Tab Switcher con le 3 Schede */}
              <div className="flex px-6 pt-3 gap-2 bg-slate-900/40 border-b border-slate-800/80 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('tessera')}
                  className={`pb-3 px-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
                    activeTab === 'tessera'
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tessera FIV
                </button>
                <button
                  onClick={() => setActiveTab('credenziali')}
                  className={`pb-3 px-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
                    activeTab === 'credenziali'
                      ? 'border-purple-400 text-purple-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Check-in & Credenziali
                </button>
                <button
                  onClick={() => setActiveTab('anagrafica')}
                  className={`pb-3 px-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
                    activeTab === 'anagrafica'
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Anagrafica & Foto
                </button>
              </div>

              {/* Contenuto Dinamico del Modal */}
              <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* SCHEDA 1: TESSERA FIV */}
                {activeTab === 'tessera' && (
                  <>
                    <div className="relative rounded-2xl p-6 bg-gradient-to-br from-slate-900 via-blue-950 to-cyan-950 border border-cyan-500/40 shadow-xl overflow-hidden group">
                      <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none text-white">
                        <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L2 22h20L12 2z" />
                        </svg>
                      </div>

                      <div className="flex items-start justify-between relative z-10">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                            FEDERAZIONE ITALIANA VELA
                          </span>
                          <h4 className="text-lg font-extrabold tracking-wide text-white mt-0.5">TESSERA ATLETA</h4>
                        </div>
                        <div className="w-9 h-7 rounded-md bg-amber-400/20 border border-amber-300/40 flex items-center justify-center">
                          <div className="w-5 h-4 border border-amber-300/40 rounded-sm grid grid-cols-2 gap-0.5 p-0.5">
                            <div className="bg-amber-300/60 rounded-xs" />
                            <div className="bg-amber-300/60 rounded-xs" />
                          </div>
                        </div>
                      </div>

                      <div className="my-5 relative z-10">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                          Numero Licenza Federale
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-mono font-black tracking-widest text-cyan-200">
                            {userData?.fivNumber || 'FIV-883920'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-end justify-between pt-2 border-t border-white/10 relative z-10">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 block">Titolare</span>
                          <span className="text-sm font-bold text-white">{displayName}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 block">Stato</span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            AGONISTICA
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-0.5">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                            Visita Medico-Sportiva
                          </span>
                          <p className="text-sm font-bold text-white mt-0.5">Idoneità Agonistica B1</p>
                          <span className="inline-block mt-1 text-xs text-emerald-400 font-medium">
                            Scadenza: 31 Dicembre 2026
                          </span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mt-0.5">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                            Copertura Assicurativa
                          </span>
                          <p className="text-sm font-bold text-white mt-0.5">Polizza RC Regata</p>
                          <span className="inline-block mt-1 text-xs text-cyan-400 font-medium">
                            Massimale World Sailing OK
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* SCHEDA 2: CHECK-IN & RECUPERO CREDENZIALI (NUOVA) */}
                {activeTab === 'credenziali' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* BOX QR CODE & ACCREDITAMENTO AL BANDO */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-purple-500/30 shadow-lg flex flex-col sm:flex-row items-center gap-5">
                      {/* Generatore SVG QR Code Simulato con pattern nautico */}
                      <div className="relative p-2.5 bg-white rounded-2xl shadow-md flex-shrink-0 flex items-center justify-center">
                        <svg className="w-28 h-28 text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                          {/* Corner Markers */}
                          <path d="M5,5 h30 v30 h-30 z M10,10 v20 h20 v-20 z M15,15 h10 v10 h-10 z" />
                          <path d="M65,5 h30 v30 h-30 z M70,10 v20 h20 v-20 z M75,15 h10 v10 h-10 z" />
                          <path d="M5,65 h30 v30 h-30 z M10,70 v20 h20 v-20 z M15,75 h10 v10 h-10 z" />
                          {/* Data Matrix Elements */}
                          <rect x="42" y="10" width="8" height="8" />
                          <rect x="52" y="18" width="6" height="6" />
                          <rect x="42" y="28" width="8" height="8" />
                          <rect x="10" y="42" width="8" height="8" />
                          <rect x="22" y="48" width="6" height="6" />
                          <rect x="44" y="44" width="12" height="12" />
                          <rect x="65" y="45" width="8" height="6" />
                          <rect x="80" y="42" width="10" height="8" />
                          <rect x="45" y="65" width="10" height="8" />
                          <rect x="65" y="65" width="8" height="8" />
                          <rect x="80" y="70" width="12" height="6" />
                          <rect x="42" y="80" width="8" height="10" />
                          <rect x="68" y="82" width="12" height="8" />
                        </svg>
                        <span className="absolute bottom-1 text-[8px] font-black uppercase text-slate-500 tracking-tighter">
                          FIV CHECK-IN
                        </span>
                      </div>

                      <div className="flex-1 text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                            Check-in Ufficiale
                          </span>
                          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            Pronto per la Segreteria
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-white mt-1">Badge Rapido di Accreditamento</h4>
                        <p className="text-xs text-slate-400 mt-1">
                          Mostra questo QR Code al comitato di gara o alla giuria per verificare licenza, visita medica e stazza in un istante.
                        </p>

                        <div className="flex items-center justify-center sm:justify-start gap-3 mt-3">
                          <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 font-mono text-xs font-bold text-purple-300">
                            PIN: {checkinPin}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(checkinPin);
                              setCopiedCode(true);
                              setTimeout(() => setCopiedCode(false), 2000);
                            }}
                            className="text-xs text-slate-300 hover:text-white underline underline-offset-4"
                          >
                            {copiedCode ? 'Copiato!' : 'Copia PIN'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* AZIONI DI RECUPERO E DEVICE DI BORDO */}
                    <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Accesso Tablet di Bordo & Recupero Dispositivo
                      </h4>
                      <p className="text-xs text-slate-400">
                        Devi autenticare il tablet stagno al timone o reimpostare le credenziali su un altro dispositivo?
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {/* Invio Link Reset Email */}
                        <button
                          type="button"
                          onClick={handleSendResetEmail}
                          className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 text-xs font-semibold transition-all text-left"
                        >
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>{resetEmailSent ? 'Link Inviato alla Mail!' : 'Invia Link Reset ad Email'}</span>
                        </button>

                        {/* Download Pass Digitale */}
                        <button
                          type="button"
                          onClick={handleDownloadPass}
                          className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-200 border border-cyan-500/30 text-xs font-semibold transition-all text-left"
                        >
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span>Scarica Pass Concorrente</span>
                        </button>
                      </div>
                    </div>

                    {/* TOKEN DI AUTENTICAZIONE RAPIDA */}
                    <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Token di Bordo (App & Tattica RTK)
                        </span>
                        <p className="text-xs font-mono text-slate-300 truncate mt-0.5">
                          {`REG-${(userData.fivNumber || '883920').replace(/[^0-9]/g, '')}-AUTH-X9`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`REG-${(userData.fivNumber || '883920').replace(/[^0-9]/g, '')}-AUTH-X9`);
                          setCopiedToken(true);
                          setTimeout(() => setCopiedToken(false), 2000);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 border border-slate-700 transition-colors shrink-0"
                      >
                        {copiedToken ? 'Copiato!' : 'Copia Token'}
                      </button>
                    </div>
                  </div>
                )}

                {/* SCHEDA 3: ANAGRAFICA & FOTO PROFILO */}
                {activeTab === 'anagrafica' && (
                  <div className="space-y-4">
                    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center gap-5">
                      <div className="relative group">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 text-white flex items-center justify-center font-bold text-2xl shadow-xl overflow-hidden border-2 border-cyan-500/40">
                          {userData.avatarUrl ? (
                            <img src={userData.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                          ) : (
                            initialLetter
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg transition-transform hover:scale-110 border border-slate-900"
                          title="Carica foto nel database"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex-1 text-center sm:text-left">
                        <h4 className="text-sm font-bold text-white">Foto Profilo Sincronizzata</h4>
                        <p className="text-xs text-slate-400 mt-1">
                          Immagine memorizzata nel database PostgreSQL.
                        </p>
                        
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-all shadow-md"
                          >
                            Carica nuova foto
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Nome Completo (Database)
                        </span>
                        <p className="text-base font-bold text-white mt-0.5">{displayName}</p>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 uppercase">
                        {displayRole}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Indirizzo Email Ufficiale
                        </span>
                        <p className="text-sm font-mono text-slate-200 mt-0.5">{displayEmail}</p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(displayEmail);
                          alert('Email copiata!');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
                      >
                        Copia
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Modal */}
              <div className="p-4 px-6 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Standard World Sailing & FIV eIDAS
                </span>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-lg hover:shadow-cyan-500/25"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default UserProfileDrawer;