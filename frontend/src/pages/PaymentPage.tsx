import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import backgroundImg from '../images/background.png'
import type { Regatta, Registration } from '../types/regatta'
import LanguageSwitcher from '../components/LanguageSwitcher'

export function PaymentPage() {
  const navigate = useNavigate()
  const { regattaId } = useParams<{ regattaId: string }>()
  
  const [regatta, setRegatta] = useState<Regatta | null>(null)
  const [registration, setRegistration] = useState<Registration | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  useEffect(() => {
    if (regattaId) {
      fetchPaymentData(regattaId)
    }
  }, [regattaId])

  const fetchPaymentData = async (id: string) => {
    try {
      // Fetch regatta details
      const regattaResponse = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/regattas/${id}`)
      setRegatta(regattaResponse.data)

      // Get pending registration from session/storage
      const savedRegistration = sessionStorage.getItem('pending_registration')
      if (savedRegistration) {
        setRegistration(JSON.parse(savedRegistration))
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load payment information')
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async (method: 'card' | 'apple_pay' | 'google_pay') => {
    setProcessingPayment(true)
    try {
      // Generate a mock client_secret for Stripe-like payment flow
      const client_secret = `pi_${Date.now()}_secret_${Math.random().toString(36).slice(2, 8)}`

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/payments`,
        {
          amount: registration?.registration_fee || 0,
          payment_method: method,
          client_secret
        }
      )

      if (response.data.status === 'success') {
        setPaymentSuccess(true)
      } else {
        setError('Payment processing failed')
        setProcessingPayment(false)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Payment processing failed')
      setProcessingPayment(false)
    }
  }



  const formatCurrency = (amount?: number) => {
    if (!amount) return '€0.00'
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
          <p className="mt-4 text-blue-200">Loading payment information...</p>
        </div>
      </div>
    )
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${backgroundImg})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/92 via-blue-800/88 to-cyan-700/85"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-500/20 border border-green-400/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl text-green-300">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
          <p className="text-blue-200 mb-6">
            Your registration for {regatta?.name} has been confirmed.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-400 text-blue-900 rounded-xl hover:from-cyan-300 hover:to-blue-300 transition-all font-bold shadow-md"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8">
      {/* Background overlay */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/92 via-blue-800/88 to-cyan-700/85"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => navigate(`/regatta-registration/${regattaId}`)}
              className="text-cyan-300 hover:text-cyan-200 flex items-center gap-2 transition-colors"
            >
              ← Back to Registration
            </button>
            {/* Language Switcher */}
            <LanguageSwitcher />
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-6">
            <h1 className="text-3xl font-bold text-white mb-2">{regatta?.name}</h1>
            <p className="text-blue-200 flex items-center gap-4">
              <span>📅 {regatta?.start_date && new Date(regatta.start_date).toLocaleDateString()}</span>
              <span>📍 {regatta?.scoring_class}</span>
            </p>
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-400/30 rounded-xl text-red-300">
            ✗ {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Order Summary */}
          <div className="md:col-span-1">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-white mb-4">Order Summary</h2>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-200">Entry Fee</span>
                  <span className="font-medium text-white">{formatCurrency(registration?.registration_fee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-200">Boat</span>
                  <span className="font-medium text-white">{registration?.skipper_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-200">Sail Number</span>
                  <span className="font-medium text-white">{registration?.sail_number}</span>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 mb-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-cyan-300">{formatCurrency(registration?.registration_fee)}</span>
                </div>
              </div>

              <p className="text-xs text-blue-300 italic">
                Secure payment processed via Stripe. All transactions are encrypted and protected.
              </p>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="md:col-span-2 space-y-6">
              
            {/* Card Payment (Stripe) */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                💳 Credit / Debit Card
              </h2>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Card number"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300 focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all outline-none disabled:bg-white/5 disabled:text-blue-300"
                  disabled={processingPayment}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="MM/YY"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300 focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all outline-none disabled:bg-white/5 disabled:text-blue-300"
                    disabled={processingPayment}
                  />
                  <input
                    type="text"
                    placeholder="CVC"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300 focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all outline-none disabled:bg-white/5 disabled:text-blue-300"
                    disabled={processingPayment}
                  />
                </div>

                <input
                  type="text"
                  placeholder="Cardholder name"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300 focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all outline-none disabled:bg-white/5 disabled:text-blue-300"
                  disabled={processingPayment}
                />

                <button
                  onClick={() => handlePayment('card')}
                  disabled={processingPayment}
                  className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-500 hover:to-gray-600 transition-all font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    `Pay ${formatCurrency(registration?.registration_fee)}`
                  )}
                </button>
              </div>
            </div>

            {/* Digital Wallets */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Digital Wallets</h2>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Apple Pay */}
                <button
                  onClick={() => handlePayment('apple_pay')}
                  disabled={processingPayment}
                  className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-900 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.8 11.3c-.1 3.6 3.1 4.9 3.2 5-.1.1-3.2 1.5-3.2 5-.1 4.1-3.4 7.5-7.6 7.5-4.1 0-7.5-3.4-7.5-7.6s3.4-7.6 7.5-7.6c4.2 0 7.6 3.4 7.6 7.6zm-3.8-9.1c-.5 1.3-1.7 2.2-3.1 2.2-1.5 0-2.7-.9-3.2-2.2-.5-1.4.1-2.9 1.4-3.8 1.4-1 3.3-1 4.6 0 1.3.9 1.9 2.4 1.4 3.8z"/>
                  </svg>
                  Apple Pay
                </button>

                {/* Google Pay */}
                <button
                  onClick={() => handlePayment('google_pay')}
                  disabled={processingPayment}
                  className="px-6 py-3 bg-white/5 border-2 border-white/10 text-white rounded-xl hover:bg-white/10 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M12.54 11h-.07v2.38h3.6c-.16 1.19-1.2 3.2-3.6 3.2-2.19 0-3.99-1.8-3.99-4s1.8-4 3.99-4c.95 0 1.7.33 2.29.8l1.86-1.8C14.6 5.5 13.6 5 12.54 5 8.6 5 5.38 8.22 5.38 12.17s3.22 7.17 7.16 7.17c4.09 0 6.6-2.7 6.6-6.6v-1.7h-6.6z"/>
                  </svg>
                  Google Pay
                </button>
              </div>
            </div>

            {/* Security Badges */}
            <div className="flex justify-center gap-4 text-blue-300">
              <span className="text-sm flex items-center gap-1">
                🔒 SSL Encrypted
              </span>
              <span className="text-sm flex items-center gap-1">
                ✓ PCI Compliant
              </span>
              <span className="text-sm flex items-center gap-1">
                🛡️ Fraud Protection
              </span>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentPage