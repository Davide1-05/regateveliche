import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import backgroundImg from '../images/background.png';
import LanguageSwitcher from '../components/LanguageSwitcher';
import PluginToggle from '../components/PluginToggle';
import { usePluginState } from '../config/featureFlags';
import { useDashboardStats } from '../hooks/useDashboardStats';
import UserProfileDrawer from '../components/UserProfileDrawer';

function DashboardPage() {
  const { t } = useTranslation();
  const tacticalDashboardEnabled = usePluginState('tactical_dashboard');
  const { stats, isLoading, error, refetch, isPollingActive } = useDashboardStats(30000);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_avatar');
    window.location.href = '/login';
  };
  
  return (
    <div className="min-h-screen">
      {/* Background overlay */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/92 via-blue-800/88 to-cyan-700/85"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <header 
          style={{ position: 'relative', zIndex: 100 }} 
          className="bg-white/10 backdrop-blur-md border-b border-white/20 shadow-lg"
        >
          <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">{t('dashboard.title')}</h1>
            
            <nav className="flex gap-6 items-center">
              <Link to="/regattas" className="text-blue-100 hover:text-cyan-300 transition-colors">
                {t('dashboard.regattas')}
              </Link>
              <Link to="/clubs" className="text-blue-100 hover:text-cyan-300 transition-colors">
                {t('dashboard.clubs')}
              </Link>
              <Link to="/map" className="text-blue-100 hover:text-cyan-300 transition-colors">
                {t('dashboard.regattaMap')}
              </Link>
              
              <LanguageSwitcher />
              
              <div className="flex items-center gap-2 pl-4 border-l border-white/20">
                <span className="text-xs text-blue-200">{t('plugins.tacticalDashboard')}</span>
                <PluginToggle pluginId="tactical_dashboard" showLabel={false} />
              </div>

              <div className="flex items-center gap-3 pl-4 border-l border-white/20">
                <button 
                  onClick={handleLogout}
                  className="text-red-300 hover:text-red-200 transition-colors font-semibold text-sm px-2 py-1 rounded-lg hover:bg-red-500/10"
                >
                  {t('common.logout', 'Esci')}
                </button>
                <UserProfileDrawer onLogout={handleLogout} />
              </div>
            </nav>
          </div>
        </header>

        <main 
          style={{ position: 'relative', zIndex: 1 }} 
          className="container mx-auto px-6 py-8"
        >
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">{t('dashboard.welcome')}</h2>
            <p className="text-blue-100">{t('dashboard.description')}</p>
          </section>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-6 hover:bg-white/15 transition-colors relative overflow-hidden">
              {isLoading && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 text-sm">{t('dashboard.activeRegattas')}</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {stats?.active_regattas ?? (isLoading ? '-' : '0')}
                  </p>
                </div>
                <span className="text-4xl">🏁</span>
              </div>
              {isPollingActive && !isLoading && (
                <div className="absolute bottom-2 right-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
                </div>
              )}
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-6 hover:bg-white/15 transition-colors relative overflow-hidden">
              {isLoading && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 text-sm">{t('dashboard.registeredSailors')}</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {stats?.registered_sailors ?? (isLoading ? '-' : '0')}
                  </p>
                </div>
                <span className="text-4xl">⛵</span>
              </div>
              {isPollingActive && !isLoading && (
                <div className="absolute bottom-2 right-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
                </div>
              )}
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-6 hover:bg-white/15 transition-colors relative overflow-hidden">
              {isLoading && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 text-sm">{t('dashboard.upcomingEvents')}</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {stats?.upcoming_events ?? (isLoading ? '-' : '0')}
                  </p>
                </div>
                <span className="text-4xl">📅</span>
              </div>
              {isPollingActive && !isLoading && (
                <div className="absolute bottom-2 right-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
                </div>
              )}
            </div>
          </div>

          <section className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-6 hover:bg-white/15 transition-colors">
            <h3 className="text-lg font-semibold text-white mb-4">{t('dashboard.quickActions')}</h3>
            <div className={`grid gap-4 ${tacticalDashboardEnabled ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
              <Link to="/regattas" className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/15 transition-colors group">
                <span className="text-2xl group-hover:scale-110 transition-transform">➕</span>
                <div>
                  <p className="font-medium text-white">{t('dashboard.createRegatta')}</p>
                  <p className="text-sm text-blue-200">{t('dashboard.createNewEvent')}</p>
                </div>
              </Link>

              <Link to="/clubs" className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/15 transition-colors group">
                <span className="text-2xl group-hover:scale-110 transition-transform">🏢</span>
                <div>
                  <p className="font-medium text-white">{t('dashboard.manageClub')}</p>
                  <p className="text-sm text-blue-200">{t('dashboard.updateClubInfo')}</p>
                </div>
              </Link>

              {tacticalDashboardEnabled && (
                <Link to="/tactical-dashboard" className="flex items-center gap-3 p-4 bg-cyan-500/10 border border-cyan-400/30 rounded-lg hover:bg-cyan-500/20 transition-colors group">
                  <span className="text-2xl group-hover:scale-110 transition-transform">📡</span>
                  <div>
                    <p className="font-medium text-white">{t('dashboard.tacticalCommand')}</p>
                    <p className="text-sm text-blue-200">{t('dashboard.realTimeWrsAnalysis')}</p>
                  </div>
                </Link>
              )}

              <Link to="/map" className="flex items-center gap-3 p-4 bg-cyan-500/10 border border-cyan-400/30 rounded-lg hover:bg-cyan-500/20 transition-colors group">
                <span className="text-2xl group-hover:scale-110 transition-transform">🗺️</span>
                <div>
                  <p className="font-medium text-white">{t('dashboard.regattaMap')}</p>
                  <p className="text-sm text-blue-200">{t('dashboard.gpsTracking')}</p>
                </div>
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default DashboardPage;