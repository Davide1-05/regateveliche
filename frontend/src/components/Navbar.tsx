import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import PluginToggle from './PluginToggle';
import { usePluginState } from '../config/featureFlags';
import UserProfileDrawer from './UserProfileDrawer';

interface NavbarProps {
  showLogout?: boolean;
}

const Navbar: React.FC<NavbarProps> = () => {
  const { t } = useTranslation();
  const tacticalDashboardEnabled = usePluginState('tactical_dashboard');

  return (
    <header className="bg-white/10 backdrop-blur-md border-b border-white/20 shadow-lg sticky top-0 z-40">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/dashboard" className="text-xl font-bold text-cyan-400 hover:text-cyan-300 transition-colors">
          {t('common.appName')}
        </Link>
        
        <nav className="flex items-center gap-6">
          <Link to="/regattas" className="text-blue-100 hover:text-cyan-300 transition-colors">
            {t('dashboard.title')}
          </Link>
          <Link to="/clubs" className="text-blue-100 hover:text-cyan-300 transition-colors">
            {t('navigation.clubs')}
          </Link>
          <Link to="/map" className="text-blue-100 hover:text-cyan-300 transition-colors">
            {t('dashboard.regattaMap')}
          </Link>
          
          {/* Tactical Dashboard */}
          {tacticalDashboardEnabled && (
            <Link to="/tactical-dashboard" className="text-purple-200 hover:text-purple-300 transition-colors font-medium">
              {t('dashboard.tacticalCommand')}
            </Link>
          )}
          
          {/* Plugin Toggle */}
          <PluginToggle pluginId="tactical_dashboard" showLabel={false} />
          
          {/* Language Switcher */}
          <LanguageSwitcher />
          
          {/* Pulsante 3 linee laterali (Drawer Utente) */}
          <UserProfileDrawer />
        </nav>
      </div>
    </header>
  );
};

export default Navbar;