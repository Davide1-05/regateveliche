import React, { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import backgroundImg from '../images/background.png'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      setStatusMsg({ type: 'error', text: 'Token di recupero non presente nell\'URL o non valido.' })
      return
    }

    if (newPassword !== confirmPassword) {
      setStatusMsg({ type: 'error', text: 'Le due password inserite non coincidono.' })
      return
    }

    if (newPassword.length < 6) {
      setStatusMsg({ type: 'error', text: 'La password deve contenere almeno 6 caratteri.' })
      return
    }

    setLoading(true)
    setStatusMsg(null)

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        token,
        new_password: newPassword,
      })

      setStatusMsg({
        type: 'success',
        text: res.data?.message || 'Password aggiornata con successo! Reindirizzamento al login...'
      })

      setTimeout(() => {
        navigate('/login')
      }, 2500)
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.detail || 'Errore durante l\'aggiornamento della password. Il link potrebbe essere scaduto.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* Background overlay */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/92 via-blue-800/88 to-cyan-700/85"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-8 text-white">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">Reimposta Password</h1>
            <p className="text-xs text-blue-200 mt-1">
              Inserisci la nuova password per il tuo account velico
            </p>
          </div>

          {statusMsg && (
            <div
              className={`mb-5 p-3 rounded-xl text-xs font-semibold ${
                statusMsg.type === 'error'
                  ? 'bg-rose-500/20 text-rose-200 border border-rose-400/40'
                  : 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
              }`}
            >
              {statusMsg.text}
            </div>
          )}

          {!token ? (
            <div className="text-center py-4">
              <p className="text-sm text-amber-200 mb-4">
                Nessun token di verifica fornito. Richiedi un nuovo link dalla pagina di login.
              </p>
              <Link
                to="/login"
                className="inline-block px-5 py-2.5 rounded-xl bg-cyan-500 text-blue-950 font-bold text-xs hover:bg-cyan-400 transition-colors"
              >
                Torna al Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-blue-100 mb-1">
                  Nuova Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none transition-all disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-blue-100 mb-1">
                  Conferma Nuova Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none transition-all disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !newPassword}
                className="w-full bg-gradient-to-r from-cyan-400 to-blue-400 text-blue-900 py-3 rounded-lg font-bold hover:from-cyan-300 hover:to-blue-300 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? 'Salvataggio...' : 'Conferma Nuova Password'}
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-xs text-cyan-200 hover:text-white transition-colors">
                  ← Annulla e torna al login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordPage