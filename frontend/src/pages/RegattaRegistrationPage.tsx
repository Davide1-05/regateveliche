import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import backgroundImg from '../images/background.png'
import { useTranslation } from 'react-i18next'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Club {
  id: string | number
  name: string
  federation_code?: string | null
}

interface Regatta {
  id: string | number
  name: string
  code?: string
  start_date: string
  end_date?: string
  scoring_class: string
  status?: string
  club_id?: string | number
  organizer_id?: string | number
  organizer_club_id?: string | number
  club_name?: string
  organizer_name?: string
  organizer?: string
  club?: {
    id?: string | number
    name: string
  }
}

type CrewRole = 'skipper' | 'helm' | 'tactician' | 'trimmer' | 'bowman' | 'crew'

interface CrewMemberItem {
  name: string
  email: string
  phone?: string
  role: CrewRole
}

const ROLE_CONFIG: Record<CrewRole, { max: number; label: string; tag: string }> = {
  skipper: { max: 1, label: 'Skipper (Responsabile)', tag: 'Skipper' },
  helm: { max: 1, label: 'Timoniere', tag: 'Timoniere' },
  tactician: { max: 1, label: 'Tattico', tag: 'Tattico' },
  trimmer: { max: 4, label: 'Strimatore (Trimmer)', tag: 'Trimmer' },
  bowman: { max: 2, label: 'Vedetta / Prodiere', tag: 'Prodiere' },
  crew: { max: Infinity, label: 'Membro Equipaggio', tag: 'Equipaggio' },
}

export function RegattaRegistrationPage() {
  const { t } = useTranslation()
  const { regattaId } = useParams<{ regattaId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [regatta, setRegatta] = useState<Regatta | null>(null)
  const [clubs, setClubs] = useState<Club[]>([])
  const [error, setError] = useState<string | null>(null)

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

  // Conteggio dinamico dei ruoli a bordo
  const roleCounts: Record<CrewRole, number> = {
    skipper: crewMembers.filter(m => m.role === 'skipper').length,
    helm: crewMembers.filter(m => m.role === 'helm').length,
    tactician: crewMembers.filter(m => m.role === 'tactician').length,
    trimmer: crewMembers.filter(m => m.role === 'trimmer').length,
    bowman: crewMembers.filter(m => m.role === 'bowman').length,
    crew: crewMembers.filter(m => m.role === 'crew').length,
  }

  useEffect(() => {
    const loadData = async () => {
      if (!regattaId) {
        setError(t('registrationPage.regattaIdMissing'))
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const [regattaRes, clubsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/regattas/${regattaId}`),
          axios.get(`${API_BASE_URL}/clubs`)
        ])

        const regattaData: Regatta = regattaRes.data.regatta || regattaRes.data

        let clubsList: Club[] = []
        if (Array.isArray(clubsRes.data)) {
          clubsList = clubsRes.data
        } else if (Array.isArray(clubsRes.data?.clubs)) {
          clubsList = clubsRes.data.clubs
        } else if (Array.isArray(clubsRes.data?.data)) {
          clubsList = clubsRes.data.data
        }

        setRegatta(regattaData)
        setClubs(clubsList)

        if (regattaData.scoring_class && regattaData.scoring_class !== 'Mista') {
          setBoatDetails(prev => ({ ...prev, classType: regattaData.scoring_class }))
        }
      } catch (err: any) {
        console.error('Error loading regatta data:', err)
        setError(err.response?.data?.detail || t('registrationPage.unableToLoadRegatta'))
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [regattaId, t])

  const targetClubId = regatta?.club_id ?? regatta?.organizer_id ?? regatta?.organizer_club_id
  const matchedClub = clubs.find(c => String(c.id) === String(targetClubId))

  const organizingClubName =
    regatta?.club?.name ||
    regatta?.club_name ||
    regatta?.organizer_name ||
    regatta?.organizer ||
    matchedClub?.name ||
    (targetClubId ? `Circolo #${targetClubId}` : 'Circolo Organizzatore')

  const isMixedRegatta = !regatta?.scoring_class || regatta?.scoring_class === 'Mista'

  const addCrewMember = () => {
    if (!newCrewMember.name.trim() || !newCrewMember.email.trim()) {
      setFormErrors(prev => ({ ...prev, newCrew: t('registrationPage.nameEmailRequired') }))
      return
    }

    const currentRole = newCrewMember.role
    const maxAllowed = ROLE_CONFIG[currentRole].max

    if (roleCounts[currentRole] >= maxAllowed) {
      setFormErrors(prev => ({
        ...prev,
        newCrew: t('registrationPage.crewLimitReached', { role: ROLE_CONFIG[currentRole].label, max: maxAllowed })
      }))
      return
    }

    setCrewMembers([...crewMembers, { ...newCrewMember }])

    // Seleziona il prossimo ruolo valido disponibile
    let nextAvailableRole: CrewRole = 'crew'
    if (roleCounts.skipper === 0 && currentRole !== 'skipper') {
      nextAvailableRole = 'skipper'
    } else if (roleCounts.helm < ROLE_CONFIG.helm.max && currentRole !== 'helm') {
      nextAvailableRole = 'helm'
    }

    setNewCrewMember({ name: '', email: '', phone: '', role: nextAvailableRole })
    setFormErrors(prev => {
      const next = { ...prev }
      delete next.newCrew
      delete next.crew
      return next
    })
  }

  const removeCrewMember = (index: number) => {
    const removedRole = crewMembers[index].role
    setCrewMembers(crewMembers.filter((_, i) => i !== index))

    // Se si libera un ruolo primario (skipper/timoniere), proponilo subito nel selettore
    if (removedRole === 'skipper') {
      setNewCrewMember(prev => ({ ...prev, role: 'skipper' }))
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!boatDetails.boatName.trim()) errors.boatName = t('registrationPage.boatNameRequired')
    if (!boatDetails.sailNumber.trim()) errors.sailNumber = t('registrationPage.sailNumberRequired')

    if (crewMembers.length === 0) {
      errors.crew = t('registrationPage.addCrewMember')
    } else if (roleCounts.skipper === 0) {
      errors.crew = t('registrationPage.skipperRequired')
    }

    if (!emergencyContact.name.trim()) errors.emergencyName = t('registrationPage.emergencyNameRequired')
    if (!emergencyContact.phone.trim()) errors.emergencyPhone = t('registrationPage.emergencyPhoneRequired')
    if (!signatureAccepted) errors.signature = t('registrationPage.acceptTerms')

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      setSubmitting(true)
      const token = localStorage.getItem('access_token') || localStorage.getItem('token')
      const skipperMember = crewMembers.find(m => m.role === 'skipper')

      const payload = {
        regatta_id: regattaId,
        boat_class: boatDetails.classType,
        hull_number: boatDetails.hullId || null,
        sail_number: boatDetails.sailNumber,
        skipper_name: skipperMember ? skipperMember.name : crewMembers[0].name,
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
          <p className="text-red-300 mb-4">{error || t('registrationPage.regattaNotFound')}</p>
          <button
            onClick={() => navigate('/regattas')}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            ← {t('common.back')} {t('regattasPage.title')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8">
      {/* Background */}
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
              📝 {t('registrationPage.registrationFor')}: {regatta.name}
            </h1>
            <p className="text-blue-200 mt-2 flex flex-wrap items-center gap-2 text-sm md:text-base">
              <span className="font-semibold px-2.5 py-0.5 bg-white/10 rounded border border-white/15 text-cyan-200">
                {regatta.scoring_class || 'ORC'}
              </span>
              <span>•</span>
              <span className="text-cyan-300 font-medium flex items-center gap-1">
                🏢 {organizingClubName}
              </span>
              <span>•</span>
              <span>
                {t('registrationPage.starts')}: {new Date(regatta.start_date).toLocaleDateString()}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/regattas')}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white hover:bg-white/15 transition-colors"
          >
            ← {t('common.back')} {t('regattasPage.title')}
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Boat Details */}
          <section className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">⛵ {t('registrationPage.boatInformation')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-blue-200 mb-1">{t('registrationPage.boatName')} *</label>
                <input
                  type="text"
                  value={boatDetails.boatName}
                  onChange={(e) => setBoatDetails(prev => ({ ...prev, boatName: e.target.value }))}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                  placeholder={t('registrationPage.boatNamePlaceholder')}
                />
                {formErrors.boatName && <p className="mt-1.5 text-xs text-red-300">{formErrors.boatName}</p>}
              </div>

              <div>
                <label className="block text-sm text-blue-200 mb-1">{t('registrationPage.sailNumber')} *</label>
                <input
                  type="text"
                  value={boatDetails.sailNumber}
                  onChange={(e) => setBoatDetails(prev => ({ ...prev, sailNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                  placeholder={t('registrationPage.sailNumberPlaceholder')}
                />
                {formErrors.sailNumber && <p className="mt-1.5 text-xs text-red-300">{formErrors.sailNumber}</p>}
              </div>

              <div>
                <label className="block text-sm text-blue-200 mb-1">{t('registrationPage.modelHullId')}</label>
                <input
                  type="text"
                  value={boatDetails.hullId}
                  onChange={(e) => setBoatDetails(prev => ({ ...prev, hullId: e.target.value }))}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                  placeholder={t('registrationPage.hullIdPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm text-blue-200 mb-1 flex items-center justify-between">
                  <span>{t('registrationPage.ratingClass')} *</span>
                  {!isMixedRegatta && (
                    <span className="text-[11px] text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                      {t('registrationPage.boundByEvent')}
                    </span>
                  )}
                </label>
                <select
                  disabled={!isMixedRegatta}
                  value={boatDetails.classType}
                  onChange={(e) => setBoatDetails(prev => ({ ...prev, classType: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition-all ${
                    !isMixedRegatta
                      ? 'bg-white/5 border-white/10 text-cyan-200 cursor-not-allowed opacity-80'
                      : 'bg-white/10 border-white/20 text-blue-100 focus:ring-2 focus:ring-cyan-400 cursor-pointer'
                  } [&>option]:bg-slate-800 [&>option]:text-white`}
                >
                  <option value="ORC">{t('scoringClass.orc')}</option>
                  <option value="IRC">{t('scoringClass.irс')}</option>
                  <option value="One Design">{t('scoringClass.oneDesign')}</option>
                  <option value="Libera">{t('scoringClass.libera')}</option>
                  <option value="Yardstick">{t('scoringClass.yardstick')}</option>
                  <option value="PHRF">{t('scoringClass.phrf')}</option>
                  <option value="Classic">{t('scoringClass.classic')}</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section 2: Crew Roster */}
          <section className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h2 className="text-xl font-semibold text-white">👥 {t('registrationPage.crewMembers')} *</h2>
              
              {/* Complete summary of all limits */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className={`px-2 py-0.5 rounded border ${
                  roleCounts.skipper === 1 
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30' 
                    : 'bg-amber-950/80 text-amber-300 border-amber-500/30 font-semibold'
                }`}>
                  Skipper: {roleCounts.skipper}/1 {roleCounts.skipper === 0 && t('registrationPage.required')}
                </span>
                <span className="px-2 py-0.5 bg-white/5 border border-white/15 text-blue-200 rounded">
                  Helm: {roleCounts.helm}/1
                </span>
                <span className="px-2 py-0.5 bg-white/5 border border-white/15 text-blue-200 rounded">
                  Tactician: {roleCounts.tactician}/1
                </span>
                <span className="px-2 py-0.5 bg-white/5 border border-white/15 text-blue-200 rounded">
                  Trimmer: {roleCounts.trimmer}/4
                </span>
                <span className="px-2 py-0.5 bg-white/5 border border-white/15 text-blue-200 rounded">
                  Bowman: {roleCounts.bowman}/2
                </span>
              </div>
            </div>

            {formErrors.crew && (
              <p className="mb-3 text-xs text-red-300 bg-red-500/10 border border-red-500/30 p-2.5 rounded-lg">
                ⚠️ {formErrors.crew}
              </p>
            )}

            {/* Inserted Members List */}
            {crewMembers.length > 0 && (
              <div className="space-y-2 mb-4">
                {crewMembers.map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                    <div>
                      <span className="font-semibold text-white text-sm">{member.name}</span>
                      <span className={`ml-2 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${
                        member.role === 'skipper'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                          : 'bg-cyan-950 text-cyan-300 border-cyan-500/30'
                      }`}>
                        {ROLE_CONFIG[member.role].tag}
                      </span>
                      <p className="text-xs text-blue-200/70 mt-0.5">{member.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCrewMember(index)}
                      className="px-2.5 py-1 bg-red-500/20 border border-red-400/30 text-red-300 hover:bg-red-500/30 rounded text-xs transition-colors"
                    >
                      {t('registrationPage.remove')}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Member Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
              <input
                type="text"
                value={newCrewMember.name}
                onChange={(e) => setNewCrewMember(prev => ({ ...prev, name: e.target.value }))}
                className="px-3 py-1.5 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                placeholder={t('registrationPage.fullName')}
              />
              <input
                type="email"
                value={newCrewMember.email}
                onChange={(e) => setNewCrewMember(prev => ({ ...prev, email: e.target.value }))}
                className="px-3 py-1.5 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                placeholder={t('registrationPage.emailAddress')}
              />
              <input
                type="text"
                value={newCrewMember.phone}
                onChange={(e) => setNewCrewMember(prev => ({ ...prev, phone: e.target.value }))}
                className="px-3 py-1.5 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                placeholder={t('registrationPage.phoneNumberOptional')}
              />

              {/* Role Selection with Specific Limits */}
              <select
                value={newCrewMember.role}
                onChange={(e) => setNewCrewMember(prev => ({ ...prev, role: e.target.value as CrewRole }))}
                className="px-3 py-1.5 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 outline-none cursor-pointer [&>option]:bg-slate-800 [&>option]:text-white"
              >
                <option value="skipper" disabled={roleCounts.skipper >= ROLE_CONFIG.skipper.max}>
                  Skipper (Responsabile) ({roleCounts.skipper}/1) {roleCounts.skipper >= 1 ? `— ${t('registrationPage.limitReached')}` : `— ${t('registrationPage.required')}`}
                </option>
                <option value="helm" disabled={roleCounts.helm >= ROLE_CONFIG.helm.max}>
                  Helm ({roleCounts.helm}/1) {roleCounts.helm >= 1 ? `— ${t('registrationPage.limitReached')}` : ''}
                </option>
                <option value="tactician" disabled={roleCounts.tactician >= ROLE_CONFIG.tactician.max}>
                  Tactician ({roleCounts.tactician}/1) {roleCounts.tactician >= 1 ? `— ${t('registrationPage.limitReached')}` : ''}
                </option>
                <option value="trimmer" disabled={roleCounts.trimmer >= ROLE_CONFIG.trimmer.max}>
                  Trimmer ({roleCounts.trimmer}/4) {roleCounts.trimmer >= 4 ? `— ${t('registrationPage.limitReached')}` : ''}
                </option>
                <option value="bowman" disabled={roleCounts.bowman >= ROLE_CONFIG.bowman.max}>
                  Bowman ({roleCounts.bowman}/2) {roleCounts.bowman >= 2 ? `— ${t('registrationPage.limitReached')}` : ''}
                </option>
                <option value="crew">
                  Crew Member ({roleCounts.crew}) — Unlimited
                </option>
              </select>
            </div>

            {formErrors.newCrew && <p className="mt-2 text-xs text-red-300">{formErrors.newCrew}</p>}

            <button
              type="button"
              onClick={addCrewMember}
              className="mt-3 px-4 py-2 bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/30 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              + {t('registrationPage.addCrewMember')}
            </button>
          </section>

          {/* Section 3: Emergency Contact */}
          <section className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">🚨 {t('registrationPage.emergencyContact')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-blue-200 mb-1">{t('registrationPage.shoreContactPerson')} *</label>
                <input
                  type="text"
                  value={emergencyContact.name}
                  onChange={(e) => setEmergencyContact(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                  placeholder={t('registrationPage.fullName')}
                />
                {formErrors.emergencyName && <p className="mt-1.5 text-xs text-red-300">{formErrors.emergencyName}</p>}
              </div>

              <div>
                <label className="block text-sm text-blue-200 mb-1">{t('registrationPage.phoneNumber')} *</label>
                <input
                  type="tel"
                  value={emergencyContact.phone}
                  onChange={(e) => setEmergencyContact(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                  placeholder={t('registrationPage.phonePlaceholder')}
                />
                {formErrors.emergencyPhone && <p className="mt-1.5 text-xs text-red-300">{formErrors.emergencyPhone}</p>}
              </div>
            </div>
          </section>

          {/* Section 4: Notice & Consent */}
          <section className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">📝 {t('registrationPage.rulesLiability')}</h2>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={signatureAccepted}
                onChange={(e) => setSignatureAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-white/20 bg-white/10 text-cyan-500 focus:ring-cyan-400 cursor-pointer"
              />
              <span className="text-sm text-blue-100 leading-relaxed">
                {t('registrationPage.declarationText')}
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
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? t('registrationPage.submitting') : t('registrationPage.completeRegistration')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegattaRegistrationPage