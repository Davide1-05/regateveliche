import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import TacticalDashboardPage from './pages/TacticalDashboardPage'
import { OfficialNoticeBoardPage } from './pages/OfficialNoticeBoardPage'
import { PaymentPage } from './pages/PaymentPage'
import RegattaRegistrationPage from './pages/RegattaRegistrationPage'
import RegattaMapPage from './pages/RegattaMapPage'
import RegattasPage from './pages/RegattasPage'
import ClubsPage from './pages/ClubsPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/tactical" element={<TacticalDashboardPage />} />
        <Route path="/notices" element={<OfficialNoticeBoardPage />} />
        <Route path="/payment/:regattaId" element={<PaymentPage />} />

        {/* Rotte Iscrizione Regata */}
        <Route path="/regattas/:regattaId/register" element={<RegattaRegistrationPage />} />
        <Route path="/regatta-registration/:regattaId" element={<RegattaRegistrationPage />} />

        <Route path="/map" element={<RegattaMapPage />} />
        <Route path="/regattas" element={<RegattasPage />} />
        <Route path="/clubs" element={<ClubsPage />} />
      </Routes>
    </Router>
  )
}

export default App