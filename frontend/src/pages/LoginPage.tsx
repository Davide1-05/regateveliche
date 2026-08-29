import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import backgroundImg from '../images/background.png'
import LanguageSwitcher from '../components/LanguageSwitcher'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      })

      // Store JWT token in localStorage
      localStorage.setItem('access_token', response.data.access_token)
      localStorage.setItem('token_type', response.data.token_type || 'bearer')

      // Navigate to dashboard on success
      navigate('/dashboard')
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.detail || t('login.signIn')
        )
      } else {
        setError(t('common.loading'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* Background overlay for auth pages */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/92 via-blue-800/88 to-cyan-700/85"></div>
      </div>

      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-20">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="text-white text-xl font-bold">{t('common.appName')}</Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-white hover:text-cyan-200 transition-colors">{t('common.login')}</Link>
            <Link to="/register" className="bg-white text-blue-900 px-4 py-2 rounded-lg hover:bg-cyan-50 transition-colors font-semibold">{t('home.getStarted')}</Link>
            <LanguageSwitcher />
          </div>
        </nav>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md mt-20">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-8">
          <h1 className="text-3xl font-bold text-center text-white mb-2">{t('login.title')}</h1>
          <p className="text-center text-blue-200 mb-8">{t('login.signIn')}</p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-400/40 rounded-lg">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-blue-100 mb-1">
                {t('login.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none transition-all disabled:bg-white/5 disabled:text-blue-300"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-blue-100 mb-1">
                {t('login.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none transition-all disabled:bg-white/5 disabled:text-blue-300"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-400 to-blue-400 text-blue-900 py-3 rounded-lg font-bold hover:from-cyan-300 hover:to-blue-300 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('login.signingIn') : t('login.signIn')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-blue-200">
              {t('login.noAccount')}{' '}
              <Link to="/register" className="text-cyan-300 hover:text-cyan-200 font-semibold transition-colors">
                {t('login.registerNow')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
