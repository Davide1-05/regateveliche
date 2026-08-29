import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

interface NavbarProps {
  showLogout?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ showLogout = false }) => {
  const { t } = useTranslation();

  return (
    <header className="bg-white/10 backdrop-blur-md border-b border-white/20 shadow-lg">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/dashboard" className="text-xl font-bold text-cyan-400 hover:text-cyan-300 transition-colors">
          {t('common.appName')}
        </Link>
        
        <nav className="flex items-center gap-6">
          <Link to="/regattas" className="text-blue-100 hover:text-cyan-300 transition-colors">{t('dashboard.title')}</Link>
          <Link to="/clubs" className="text-blue-100 hover:text-cyan-300 transition-colors">{t('navigation.clubs')}</Link>
          <Link to="/map" className="text-blue-100 hover:text-cyan-300 transition-colors">{t('dashboard.regattaMap')}</Link>
          
          {/* Language Switcher */}
          <LanguageSwitcher />
          
          {showLogout && (
            <button className="text-red-300 hover:text-red-200 transition-colors font-semibold">
              {t('common.logout') || 'Logout'}
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;