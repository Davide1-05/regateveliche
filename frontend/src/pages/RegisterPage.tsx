import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import backgroundImg from '../images/background.png'
import LanguageSwitcher from '../components/LanguageSwitcher'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Validazione email standard
const isValidEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email.trim())
}

// Password: min 8 caratteri, almeno 1 minuscola, 1 MAIUSCOLA, 1 numero e 1 carattere speciale
const isValidPassword = (password: string): boolean => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]{8,}$/
  return regex.test(password)
}

// Vincolo Nome: Almeno Nome e Cognome (2 parole), solo lettere/spazi/apostrofi, niente numeri
const isValidFullName = (name: string): boolean => {
  const trimmed = name.trim()
  const parts = trimmed.split(/\s+/)
  const lettersOnly = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/
  return parts.length >= 2 && trimmed.length >= 5 && lettersOnly.test(trimmed)
}

function RegisterPage() {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [apiError, setApiError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const validateForm = (): string[] => {
    const errors: string[] = []

    if (!isValidFullName(name)) {
      errors.push('Inserisci sia Nome che Cognome (senza numeri o simboli speciali).')
    }

    if (!isValidEmail(email)) {
      errors.push('Inserisci un indirizzo email valido.')
    }

    if (!isValidPassword(password)) {
      errors.push(
        'La password deve contenere almeno 8 caratteri, una lettera maiuscola, una minuscola, un numero e un carattere speciale (es. !@#$%).'
      )
    }

    if (password !== confirmPassword) {
      errors.push(t('register.confirmPassword') || 'Le password non coincidono.')
    }

    return errors
  }

  // Prevenzione submit accidentale premendo Invio
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
      // 1. Registrazione utente
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        full_name: name.trim(),
        email: email.trim(),
        password,
      })

      let token = response.data?.access_token
      let tokenType = response.data?.token_type || 'bearer'

      // Fallback: se il backend rispondeva con il vecchio formato senza token, effettua login istantaneo
      if (!token) {
        const loginRes = await axios.post(`${API_BASE_URL}/auth/login`, {
          email: email.trim(),
          password,
        })
        token = loginRes.data.access_token
        tokenType = loginRes.data.token_type || 'bearer'
      }

      // Salva token di autenticazione e reindirizza alla Dashboard
      localStorage.setItem('access_token', token)
      localStorage.setItem('token_type', tokenType)
      navigate('/dashboard')
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        setApiError(
          err.response?.data?.detail || t('register.createAccount')
        )
      } else {
        setApiError(t('common.loading'))
      }
    } finally {
      setLoading(false)
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
          <h1 className="text-3xl font-bold text-center text-white mb-2">{t('register.title')}</h1>
          <p className="text-center text-blue-200 mb-8">{t('login.signIn')}</p>

          {/* Box errori di validazione client */}
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

          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-blue-100 mb-1">
                {t('register.fullName')}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (validationErrors.length > 0) setValidationErrors([])
                }}
                required
                disabled={loading}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none transition-all disabled:bg-white/5"
                placeholder="Mario Rossi"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-blue-100 mb-1">
                {t('register.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (validationErrors.length > 0) setValidationErrors([])
                }}
                required
                disabled={loading}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none transition-all disabled:bg-white/5"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-blue-100 mb-1">
                {t('register.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (validationErrors.length > 0) setValidationErrors([])
                }}
                required
                disabled={loading}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none transition-all disabled:bg-white/5"
                placeholder="Min. 8 caratt., 1 maiusc., 1 num., 1 spec."
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-blue-100 mb-1">
                {t('register.confirmPassword')}
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (validationErrors.length > 0) setValidationErrors([])
                }}
                required
                disabled={loading}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none transition-all disabled:bg-white/5"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-400 to-blue-400 text-blue-900 py-3 rounded-lg font-bold hover:from-cyan-300 hover:to-blue-300 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? t('register.registering') : t('register.createAccount')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-blue-200">
              {t('register.alreadyHaveAccount')}{' '}
              <Link to="/login" className="text-cyan-300 hover:text-cyan-200 font-semibold transition-colors">
                {t('register.signIn')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage