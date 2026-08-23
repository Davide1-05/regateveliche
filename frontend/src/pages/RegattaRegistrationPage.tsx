import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import backgroundImg from '../images/background.png'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Club {
  id: string
  name: string
  federation_code?: string | null
}

interface Regatta {
  id: string
  name: string
  code: string
  start_date: string
  end_date: string
  scoring_class: string
  status: string
}

interface CrewMemberItem {
  name: string
  email: string
  phone?: string
  role: string
}

export function RegattaRegistrationPage() {
  const { regattaId } = useParams<{ regattaId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [regatta, setRegatta] = useState<Regatta | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [clubs, setClubs] = useState<Club[]>([])
  const [selectedClubId, setSelectedClubId] = useState('')

  // Boat Details
  const [boatDetails, setBoatDetails] = useState({
    boatName: '',
    sailNumber: '',
    hullId: '',
    classType: 'ORC',
  })

  // Crew Data
  const [crewMembers, setCrewMembers] = useState<CrewMemberItem[]>([])
  const [newCrewMember, setNewCrewMember] = useState<CrewMemberItem>({
    name: '',
    email: '',
    phone: '',
    role: 'skipper',
  })

  // Emergency Contact & Rules
  const [emergencyContact, setEmergencyContact] = useState({ name: '', phone: '' })
  const [signatureAccepted, setSignatureAccepted] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const loadData = async () => {
      if (!regattaId) {
        setError('Regatta ID is missing from the URL')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const [regattaRes, clubsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/regattas/${regattaId}`),
          axios.get(`${API_BASE_URL}/clubs`)
        ])
        setRegatta(regattaRes.data.regatta || regattaRes.data)
        setClubs(clubsRes.data.clubs || [])
      } catch (err: any) {
        console.error('Error loading regatta:', err)
        setError(err.response?.data?.detail || 'Unable to load regatta data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [regattaId])

  const addCrewMember = () => {
    if (!newCrewMember.name.trim() || !newCrewMember.email.trim()) {
      setFormErrors(prev => ({ ...prev, newCrew: 'Name and email are required' }))
      return
    }
    setCrewMembers([...crewMembers, { ...newCrewMember }])
    setNewCrewMember({ name: '', email: '', phone: '', role: 'crew' })
    setFormErrors(prev => {
      const next = { ...prev }
      delete next.newCrew
      return next
    })
  }

  const removeCrewMember = (index: number) => {
    setCrewMembers(crewMembers.filter((_, i) => i !== index))
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!selectedClubId) errors.club = 'Please select a club'
    if (!boatDetails.boatName.trim()) errors.boatName = 'Boat name is required'
    if (!boatDetails.sailNumber.trim()) errors.sailNumber = 'Sail number is required'
    if (crewMembers.length === 0) errors.crew = 'Please add at least one crew member'
    if (!emergencyContact.name.trim()) errors.emergencyName = 'Emergency contact name is required'
    if (!emergencyContact.phone.trim()) errors.emergencyPhone = 'Emergency phone number is required'
    if (!signatureAccepted) errors.signature = 'You must accept the terms and rules to register'

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      setSubmitting(true)
      const token = localStorage.getItem('access_token') || localStorage.getItem('token')

      const payload = {
        regatta_id: regattaId,
        boat_class: boatDetails.classType,
        hull_number: boatDetails.hullId || null,
        sail_number: boatDetails.sailNumber,
        skipper_name: crewMembers.length > 0 ? crewMembers[0].name : 'Skipper',
        crew_names: JSON.stringify(crewMembers.map(m => m.name)),
        crew_members: crewMembers,
        signature_hash: `sha256:${btoa(boatDetails.sailNumber + Date.now())}`,
      }

      await axios.post(`${API_BASE_URL}/registrations`, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })

      navigate('/regattas')
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.detail || 'Error submitting registration')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    )
  }

  if (error || !regatta) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl border border-white/20 text-center max-w-md">
          <p className="text-red-300 mb-4">{error || 'Regatta not found'}</p>
          <button
            onClick={() => navigate('/regattas')}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            ← Back to Regattas
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8">
      {/* Background overlay */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{ backgroundImage: `url(${backgroundImg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/92 via-blue-800/88 to-cyan-700/85"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              📝 Registration: {regatta.name}
            </h1>
            <p className="text-blue-200 mt-2">
              {regatta.scoring_class} • Starts: {new Date(regatta.start_date).toLocaleDateString()}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/regattas')}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white hover:bg-white/15 transition-colors"
          >
            ← Back to Regattas
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Organizing Club */}
          <section className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">🏢 Organizing Club</h2>
            <select
              value={selectedClubId}
              onChange={(e) => setSelectedClubId(e.target.value)}
              className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 outline-none cursor-pointer [&>option]:bg-slate-800 [&>option]:text-white"
            >
              <option value="">-- Select a Club --</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.federation_code ? `(${c.federation_code})` : ''}
                </option>
              ))}
            </select>
            {formErrors.club && <p className="mt-1.5 text-xs text-red-300">{formErrors.club}</p>}
          </section>

          {/* Section 2: Boat Details */}
          <section className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">⛵ Boat Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-blue-200 mb-1">Boat Name *</label>
                <input
                  type="text"
                  value={boatDetails.boatName}
                  onChange={(e) => setBoatDetails(prev => ({ ...prev, boatName: e.target.value }))}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                  placeholder="e.g. Black Pearl"
                />
                {formErrors.boatName && <p className="mt-1.5 text-xs text-red-300">{formErrors.boatName}</p>}
              </div>

              <div>
                <label className="block text-sm text-blue-200 mb-1">Sail Number *</label>
                <input
                  type="text"
                  value={boatDetails.sailNumber}
                  onChange={(e) => setBoatDetails(prev => ({ ...prev, sailNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                  placeholder="e.g. ITA-1234"
                />
                {formErrors.sailNumber && <p className="mt-1.5 text-xs text-red-300">{formErrors.sailNumber}</p>}
              </div>

              <div>
                <label className="block text-sm text-blue-200 mb-1">Model / Hull ID</label>
                <input
                  type="text"
                  value={boatDetails.hullId}
                  onChange={(e) => setBoatDetails(prev => ({ ...prev, hullId: e.target.value }))}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                  placeholder="e.g. J/70"
                />
              </div>

              <div>
                <label className="block text-sm text-blue-200 mb-1">Rating Class</label>
                <select
                  value={boatDetails.classType}
                  onChange={(e) => setBoatDetails(prev => ({ ...prev, classType: e.target.value }))}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 outline-none cursor-pointer [&>option]:bg-slate-800 [&>option]:text-white"
                >
                  <option value="ORC">ORC</option>
                  <option value="IRC">IRC</option>
                  <option value="One Design">One Design</option>
                  <option value="PHRF">PHRF</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section 3: Crew Roster */}
          <section className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">👥 Crew Members *</h2>
            {formErrors.crew && <p className="mb-3 text-xs text-red-300">{formErrors.crew}</p>}

            {crewMembers.length > 0 && (
              <div className="space-y-2 mb-4">
                {crewMembers.map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                    <div>
                      <span className="font-semibold text-white text-sm">{member.name}</span>
                      <span className="ml-2 px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-500/30 rounded text-[10px] uppercase font-bold tracking-wider">
                        {member.role}
                      </span>
                      <p className="text-xs text-blue-200/70 mt-0.5">{member.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCrewMember(index)}
                      className="px-2.5 py-1 bg-red-500/20 border border-red-400/30 text-red-300 hover:bg-red-500/30 rounded text-xs transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
              <input
                type="text"
                value={newCrewMember.name}
                onChange={(e) => setNewCrewMember(prev => ({ ...prev, name: e.target.value }))}
                className="px-3 py-1.5 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                placeholder="Full Name"
              />
              <input
                type="email"
                value={newCrewMember.email}
                onChange={(e) => setNewCrewMember(prev => ({ ...prev, email: e.target.value }))}
                className="px-3 py-1.5 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                placeholder="Email Address"
              />
              <input
                type="text"
                value={newCrewMember.phone}
                onChange={(e) => setNewCrewMember(prev => ({ ...prev, phone: e.target.value }))}
                className="px-3 py-1.5 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                placeholder="Phone Number (Optional)"
              />
              <select
                value={newCrewMember.role}
                onChange={(e) => setNewCrewMember(prev => ({ ...prev, role: e.target.value }))}
                className="px-3 py-1.5 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 outline-none cursor-pointer [&>option]:bg-slate-800 [&>option]:text-white"
              >
                <option value="skipper">Skipper (Person in Charge)</option>
                <option value="helm">Helm</option>
                <option value="tactician">Tactician</option>
                <option value="trimmer">Trimmer</option>
                <option value="bowman">Bowman</option>
                <option value="crew">Crew Member</option>
              </select>
            </div>
            {formErrors.newCrew && <p className="mt-2 text-xs text-red-300">{formErrors.newCrew}</p>}

            <button
              type="button"
              onClick={addCrewMember}
              className="mt-3 px-3 py-1.5 bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/30 rounded-lg text-xs font-semibold transition-colors"
            >
              + Add Crew Member
            </button>
          </section>

          {/* Section 4: Emergency Contacts */}
          <section className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">🚨 Emergency Contact</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-blue-200 mb-1">Shore Contact Person *</label>
                <input
                  type="text"
                  value={emergencyContact.name}
                  onChange={(e) => setEmergencyContact(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                  placeholder="Full Name"
                />
                {formErrors.emergencyName && <p className="mt-1.5 text-xs text-red-300">{formErrors.emergencyName}</p>}
              </div>

              <div>
                <label className="block text-sm text-blue-200 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  value={emergencyContact.phone}
                  onChange={(e) => setEmergencyContact(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                  placeholder="+39 333 1234567"
                />
                {formErrors.emergencyPhone && <p className="mt-1.5 text-xs text-red-300">{formErrors.emergencyPhone}</p>}
              </div>
            </div>
          </section>

          {/* Section 5: Notice & Consent */}
          <section className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">📝 Rules & Liability Agreement</h2>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={signatureAccepted}
                onChange={(e) => setSignatureAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-white/20 bg-white/10 text-cyan-500 focus:ring-cyan-400 cursor-pointer"
              />
              <span className="text-sm text-blue-100 leading-relaxed">
                I declare that I have read the Notice of Race and Sailing Instructions, and I release the organizing authority from any liability for damages to persons or property.
              </span>
            </label>
            {formErrors.signature && <p className="mt-2 text-xs text-red-300">{formErrors.signature}</p>}
          </section>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => navigate('/regattas')}
              className="px-5 py-2 bg-white/10 border border-white/20 text-blue-100 hover:bg-white/20 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Complete Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegattaRegistrationPage