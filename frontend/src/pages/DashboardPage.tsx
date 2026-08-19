import { Link } from 'react-router-dom'
import backgroundImg from '../images/background.png'

function DashboardPage() {
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
        {/* Header */}
        <header className="bg-white/10 backdrop-blur-md border-b border-white/20 shadow-lg">
          <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <nav className="flex gap-6">
              <Link to="/regattas" className="text-blue-100 hover:text-cyan-300 transition-colors">Regattas</Link>
              <Link to="/clubs" className="text-blue-100 hover:text-cyan-300 transition-colors">Clubs</Link>
              <Link to="/map" className="text-blue-100 hover:text-cyan-300 transition-colors">Map</Link>
              <button onClick={() => { localStorage.removeItem('token');
                                       localStorage.removeItem('user'); 
                                       window.location.href = '/login'; }}
              className="text-red-300 hover:text-red-200 transition-colors font-semibold">Logout</button>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-6 py-8">
          {/* Welcome Section */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Welcome back!</h2>
            <p className="text-blue-100">Manage your regattas and club activities from one place.</p>
          </section>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-6 hover:bg-white/15 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 text-sm">Active Regattas</p>
                  <p className="text-3xl font-bold text-white mt-1">0</p>
                </div>
                <span className="text-4xl">🏁</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-6 hover:bg-white/15 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 text-sm">Registered Sailors</p>
                  <p className="text-3xl font-bold text-white mt-1">0</p>
                </div>
                <span className="text-4xl">⛵</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-6 hover:bg-white/15 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 text-sm">Upcoming Events</p>
                  <p className="text-3xl font-bold text-white mt-1">0</p>
                </div>
                <span className="text-4xl">📅</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <section className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-6 hover:bg-white/15 transition-colors">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Link to="/regattas" className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/15 transition-colors group">
                <span className="text-2xl group-hover:scale-110 transition-transform">➕</span>
                <div>
                  <p className="font-medium text-white">Create New Regatta</p>
                  <p className="text-sm text-blue-200">Set up a new sailing event</p>
                </div>
              </Link>

              <Link to="/clubs" className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/15 transition-colors group">
                <span className="text-2xl group-hover:scale-110 transition-transform">🏢</span>
                <div>
                  <p className="font-medium text-white">Manage Club</p>
                  <p className="text-sm text-blue-200">Update club information</p>
                </div>
              </Link>

              <Link to="/tactical" className="flex items-center gap-3 p-4 bg-cyan-500/10 border border-cyan-400/30 rounded-lg hover:bg-cyan-500/20 transition-colors group">
                <span className="text-2xl group-hover:scale-110 transition-transform">📡</span>
                <div>
                  <p className="font-medium text-white">Tactical Command</p>
                  <p className="text-sm text-blue-200">Real-time WRS analysis & routing</p>
                </div>
              </Link>

              <Link to="/map" className="flex items-center gap-3 p-4 bg-cyan-500/10 border border-cyan-400/30 rounded-lg hover:bg-cyan-500/20 transition-colors group">
                <span className="text-2xl group-hover:scale-110 transition-transform">🗺️</span>
                <div>
                  <p className="font-medium text-white">Regatta Map</p>
                  <p className="text-sm text-blue-200">GPS tracking for all boats</p>
                </div>
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default DashboardPage