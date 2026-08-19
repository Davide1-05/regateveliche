import { Link } from 'react-router-dom'
import backgroundImg from '../images/background.png'

function HomePage() {
  return (
    <div className="relative min-h-screen">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${backgroundImg})`
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-blue-800/85 to-cyan-700/85"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-white text-xl font-bold">SAIL PLATFORM V3.1</div>
          <div className="flex gap-4">
            <Link to="/login" className="text-white hover:text-cyan-200 transition-colors">Login</Link>
            <Link to="/register" className="bg-white text-blue-900 px-4 py-2 rounded-lg hover:bg-cyan-50 transition-colors font-semibold">Get Started</Link>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="container mx-auto px-6 pt-20 pb-32 text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Integrated Digital Platform
            <br />
            <span className="text-cyan-300">for Sailing Regattas</span>
          </h1>
          <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto mb-8">
            Unify your regatta management with cutting-edge technology. From smart registration 
            to real-time RTK telemetry, experience the future of sailing competition.
          </p>
          
          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-16 text-left max-w-6xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-colors">
              <div className="text-cyan-300 text-4xl mb-4">⚓</div>
              <h3 className="text-white font-semibold text-lg mb-2">Smart Registration</h3>
              <p className="text-blue-100">eIDAS compliant digital signatures and automated workflows reduce club workloads.</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-colors">
              <div className="text-cyan-300 text-4xl mb-4">🏁</div>
              <h3 className="text-white font-semibold text-lg mb-2">RTK Precision Racing</h3>
              <p className="text-blue-100">&lt;2cm accuracy with &lt;100ms latency for fair and accurate OCS detection.</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-colors">
              <div className="text-cyan-300 text-4xl mb-4">🌊</div>
              <h3 className="text-white font-semibold text-lg mb-2">Sustainable Events</h3>
              <p className="text-blue-100">Support Platinum certifications with autonomous robotic buoys.</p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16">
            <Link 
              to="/register" 
              className="inline-block bg-cyan-400 text-blue-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-cyan-300 transition-colors shadow-lg"
            >
              Start Your Journey →
            </Link>
          </div>
        </main>

        {/* Footer */}
        <footer className="container mx-auto px-6 py-8 text-center text-blue-200">
          <p>&copy; 2024 SAIL PLATFORM V3.1 - All rights reserved</p>
        </footer>
      </div>
    </div>
  )
}

export default HomePage