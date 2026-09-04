import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './i18n/index'; // Inizializza i18n per tutte le lingue
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import TacticalDashboardPage from './pages/TacticalDashboardPage'
import { OfficialNoticeBoardPage } from './pages/OfficialNoticeBoardPage'
import { PaymentPage } from './pages/PaymentPage'
import RegattaRegistrationPage from './pages/RegattaRegistrationPage'
import RegattaMapPage from './pages/RegattaMapPage'
import RegattasPage from './pages/RegattasPage'
import ClubsPage from './pages/ClubsPage'
import { PluginProvider } from './config/featureFlags'

// Segnaposto temporaneo per la pagina profilo (evita errori se il file dedicato non esiste ancora)
const ProfilePlaceholder = () => (
  <div className="min-h-screen bg-slate-900 text-white p-8">
    <h1 className="text-2xl font-bold text-cyan-400 mb-2">Profilo Utente & Tessera FIV</h1>
    <p className="text-sm text-slate-400">Pagina profilo in fase di sviluppo.</p>
  </div>
);

function App() {
  return (
    <PluginProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          
          {/* Tactical Dashboard - Supporta entrambi i percorsi */}
          <Route path="/tactical" element={<TacticalDashboardPage />} />
          <Route path="/tactical-dashboard" element={<TacticalDashboardPage />} />
        
          <Route path="/notices" element={<OfficialNoticeBoardPage />} />
          <Route path="/payment/:regattaId" element={<PaymentPage />} />

          {/* Rotte Iscrizione Regata */}
          <Route path="/regattas/:regattaId/register" element={<RegattaRegistrationPage />} />
          <Route path="/regatta-registration/:regattaId" element={<RegattaRegistrationPage />} />

          <Route path="/map" element={<RegattaMapPage />} />
          <Route path="/regattas" element={<RegattasPage />} />
          <Route path="/clubs" element={<ClubsPage />} />

          {/* Rotta Profilo Utente */}
          <Route path="/profile" element={<ProfilePlaceholder />} />
        </Routes>
      </Router>
    </PluginProvider>
  )
}

export default App