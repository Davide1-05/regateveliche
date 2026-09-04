import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import backgroundImg from '../images/background.png'
import LanguageSwitcher from '../components/LanguageSwitcher'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const isValidEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email.trim())
}

function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [apiError, setApiError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Stati modale recupero password
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMessage, setForgotMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Validazione derivata da login.js
  const validateForm = (): string[] => {
    const errors: string[] = []
    if (!isValidEmail(email)) {
      errors.push('Inserisci un indirizzo email valido.')
    }
    if (password.trim() === '') {
      errors.push('Inserisci la password.')
    }
    return errors
  }

  const handleBlurValidation = () => {
    // Validazione dinamica al cambio/perdita di fuoco come in login.js
    if (email || password) {
      setValidationErrors(validateForm())
    }
  }

  // Prevenzione submit accidentale con Enter (concetto da register.js)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
      e.preventDefault()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError(null)

    const errors = validateForm()
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    setValidationErrors([])
    setLoading(true)

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: email.trim(),
        password,
      })

      localStorage.setItem('access_token', response.data.access_token)
      localStorage.setItem('token_type', response.data.token_type || 'bearer')
      navigate('/dashboard')
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        setApiError(err.response?.data?.detail || t('login.signIn'))
      } else {
        setApiError(t('common.loading'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotLoading(true)
    setForgotMessage(null)

    if (!isValidEmail(forgotEmail)) {
      setForgotMessage({ type: 'error', text: 'Inserisci un indirizzo email valido.' })
      setForgotLoading(false)
      return
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
        email: forgotEmail.trim(),
      })
      setForgotMessage({
        type: 'success',
        text: response.data?.message || 'Istruzioni inviate! Controlla la tua casella email.',
      })
    } catch (err: any) {
      setForgotMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Impossibile inviare la richiesta.',
      })
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/92 via-blue-800/88 to-cyan-700/85"></div>
      </div>

      <div className="fixed top-0 left-0 right-0 z-20">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="text-white text-xl font-bold">{t('common.appName')}</Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-white hover:text-cyan-200 transition-colors">{t('common.login')}</Link>
            <Link to="/register" className="bg-white text-blue-900 px-4 py-2 rounded-lg hover:bg-cyan-50 transition-colors font-semibold">
              {t('home.getStarted')}
            </Link>
            <LanguageSwitcher />
          </div>
        </nav>
      </div>

      <div className="relative z-10 w-full max-w-md mt-20">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-8">
          <h1 className="text-3xl font-bold text-center text-white mb-2">{t('login.title')}</h1>
          <p className="text-center text-blue-200 mb-6">{t('login.signIn')}</p>

          {/* Errori di validazione (login.js showErrors) */}
          {validationErrors.length > 0 && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-400/40 rounded-lg space-y-1">
              {validationErrors.map((err, idx) => (
                <p key={idx} className="text-xs text-red-200 font-semibold text-center">{err}</p>
              ))}
            </div>
          )}

          {/* Errore API Backend */}
          {apiError && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-400/40 rounded-lg">
              <p className="text-sm text-red-200 text-center font-semibold">{apiError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-blue-100 mb-1">
                {t('login.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (validationErrors.length > 0) setValidationErrors([])
                }}
                onBlur={handleBlurValidation}
                required
                disabled={loading}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none transition-all disabled:bg-white/5"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-blue-100">
                  {t('login.password')}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email)
                    setForgotMessage(null)
                    setIsForgotModalOpen(true)
                  }}
                  className="text-xs text-cyan-300 hover:text-cyan-200 underline transition-colors"
                >
                  Password dimenticata?
                </button>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (validationErrors.length > 0) setValidationErrors([])
                }}
                onBlur={handleBlurValidation}
                required
                disabled={loading}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none transition-all disabled:bg-white/5"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-400 to-blue-400 text-blue-900 py-3 rounded-lg font-bold hover:from-cyan-300 hover:to-blue-300 transition-all shadow-md disabled:opacity-50"
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

      {/* Modal recupero password */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-7 shadow-2xl text-white">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Recupero Credenziali</h3>
              <button onClick={() => setIsForgotModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300 mt-4 leading-relaxed">
              Inserisci l'indirizzo email del tuo account velico per ricevere il link di recupero.
            </p>

            {forgotMessage && (
              <div className={`mt-4 p-3 rounded-xl text-xs font-semibold ${
                forgotMessage.type === 'error' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
              }`}>
                {forgotMessage.text}
              </div>
            )}

            <form onSubmit={handleForgotPasswordSubmit} className="mt-5 space-y-4">
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="nome@circolovelico.it"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading || !forgotEmail}
                  className="w-1/2 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white disabled:opacity-50"
                >
                  {forgotLoading ? 'Invio in corso...' : 'Invia Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default LoginPage