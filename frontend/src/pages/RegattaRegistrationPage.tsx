import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Regatta, Registration, CrewMember } from '../types/regatta'
import { ESignatureCanvas } from '../components/ESignatureCanvas'
import backgroundImg from '../images/background.png'

// --- API Service Layer ---
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Club {
  id: string
  name: string
  federation_code?: string | null
  email: string
  phone?: string | null
  address?: string | null
  city?: string | null
  postal_code?: string | null
  certification_level: string
}

interface RegattaApiResponse {
  regatta: Regatta
}

interface CrewMemberFormData {
  name: string
  email: string
  phone: string
  role: string
  certifications: string[]
}

const createCrewMember = (data: CrewMemberFormData): CrewMember => ({
  id: undefined,
  name: data.name,
  email: data.email,
  phone: data.phone,
  role: data.role,
  certifications: data.certifications,
})

// --- Form Data Interfaces ---
interface BoatDetails {
  boatName: string
  sailNumber: string
  hullId: string
  classType: string
}

interface CertificateInfo {
  orcCertificateUrl?: string
  ircRating?: number | null
  phrfHandicap?: number | null
}

interface EmergencyContact {
  name: string
  phone: string
}

interface MedicalInfo {
  conditions: string
  medications: string[]
}

// --- Main Component ---
export function RegattaRegistrationPage() {
  const { regattaId } = useParams<{ regattaId: string }>()
  const navigate = useNavigate()
  
  // Loading states
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [clubsLoading, setClubsLoading] = useState(true)
  
  // Data states
  const [regatta, setRegatta] = useState<Regatta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clubs, setClubs] = useState<Club[]>([])
  
  // Selected club state (for club dropdown mapping to Regatta.organizer_id)
  const [selectedClubId, setSelectedClubId] = useState('')
  
  // Form sections state
  const [boatDetails, setBoatDetails] = useState<BoatDetails>({
    boatName: '',
    sailNumber: '',
    hullId: '',
    classType: 'one-design',
  })
  
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([])
  const [newCrewMember, setNewCrewMember] = useState<CrewMemberFormData>({
    name: '',
    email: '',
    phone: '',
    role: 'crew',
    certifications: [],
  })
  
  const [certificateInfo, setCertificateInfo] = useState<CertificateInfo>({})
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>({
    name: '',
    phone: '',
  })
  const [medicalConditions, setMedicalConditions] = useState('')
  
  // Signature states
  const [charterAgreementSigned, setCharterAgreementSigned] = useState(false)
  const [liabilityWaiverSigned, setLiabilityWaiverSigned] = useState(false)
  const [charterSignatureData, setCharterSignatureData] = useState('')
  const [waiverSignatureData, setWaiverSignatureData] = useState('')
  
  // Form validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Fetch clubs on mount
  useEffect(() => {
    const fetchClubs = async () => {
      try {
        setClubsLoading(true)
        const response = await fetch(`${API_BASE}/clubs`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch clubs: ${response.statusText}`)
        }
        
        const data = await response.json()
        setClubs(data.clubs || [])
      } catch (err) {
        console.error('Failed to load clubs:', err)
      } finally {
        setClubsLoading(false)
      }
    }
    
    fetchClubs()
  }, [])

  // Fetch regatta details on mount
  useEffect(() => {
    const fetchRegatta = async () => {
      if (!regattaId) return
      
      try {
        setLoading(true)
        const response = await fetch(`${API_BASE}/regattas/${regattaId}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch regatta: ${response.statusText}`)
        }
        
        const data: RegattaApiResponse = await response.json()
        setRegatta(data.regatta)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred while loading the regatta')
      } finally {
        setLoading(false)
      }
    }
    
    fetchRegatta()
  }, [regattaId])

  // Add crew member
  const addCrewMember = () => {
    if (!newCrewMember.name.trim() || !newCrewMember.email.trim()) {
      setFormErrors(prev => ({ ...prev, newCrew: 'Name and email are required' }))
      return
    }
    
    setCrewMembers([...crewMembers, createCrewMember(newCrewMember)])
    setNewCrewMember({ name: '', email: '', phone: '', role: 'crew', certifications: [] })
    setFormErrors(prev => { const n = { ...prev }; delete n.newCrew; return n })
  }

  // Remove crew member
  const removeCrewMember = (index: number) => {
    setCrewMembers(crewMembers.filter((_, i) => i !== index))
  }

  // Handle sail number lookup (simulated ORC rating fetch)
  const handleSailNumberLookup = useCallback(async () => {
    if (!boatDetails.sailNumber.trim()) return
    
    try {
      const response = await fetch(`${API_BASE}/ratings/orc?sail_number=${encodeURIComponent(boatDetails.sailNumber)}`)
      
      if (response.ok) {
        const data = await response.json()
        setCertificateInfo(prev => ({ ...prev, ircRating: data.rating }))
      }
    } catch (err) {
      console.error('Failed to fetch rating:', err)
    }
  }, [boatDetails.sailNumber])

  // Handle certificate file upload
  const handleCertificateUpload = async (file: File) => {
    try {
      // Simulated upload - in production, this would use a presigned S3 URL
      const formData = new FormData()
      formData.append('certificate', file)
      formData.append('type', 'orc')
      
      const response = await fetch(`${API_BASE}/certificates/upload`, {
        method: 'POST',
        body: formData,
      })
      
      if (response.ok) {
        const data = await response.json()
        setCertificateInfo(prev => ({ ...prev, orcCertificateUrl: data.url }))
      }
    } catch (err) {
      console.error('Failed to upload certificate:', err)
    }
  }

  // Validate form before submission
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!selectedClubId) errors.club = 'Please select a club'
    if (!boatDetails.boatName.trim()) errors.boatName = 'Boat name is required'
    if (!boatDetails.sailNumber.trim()) errors.sailNumber = 'Sail number is required'
    if (crewMembers.length === 0) errors.crew = 'At least one crew member is required'
    if (!emergencyContact.name.trim()) errors.emergencyName = 'Emergency contact name is required'
    if (!emergencyContact.phone.trim()) errors.emergencyPhone = 'Emergency contact phone is required'
    
    // Check charter agreement signature
    if (regatta?.status === 'open') {
      if (!charterAgreementSigned) errors.charterSignature = 'Charter agreement must be signed'
      if (!liabilityWaiverSigned) errors.waiverSignature = 'Liability waiver must be signed'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Submit registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    try {
      setSubmitting(true)
      
      // Generate signature hashes for legal compliance
      const generateSignatureHash = (signatureData: string): string => {
        // In production, use crypto.subtle.digest for SHA-256
        const encoder = new TextEncoder()
        const data = encoder.encode(signatureData)
        return `sha256:${btoa(String.fromCharCode(...new Uint8Array(data)))}`
      }
      
      const registrationPayload = {
        regatta_id: regattaId,
        boat_class: boatDetails.classType,
        hull_number: boatDetails.hullId,
        sail_number: boatDetails.sailNumber,
        skipper_name: crewMembers.length > 0 ? crewMembers[0].name : '',
        crew_names: JSON.stringify(crewMembers.map(m => m.name)),
        signature_hash: generateSignatureHash(
          `${charterSignatureData}${waiverSignatureData}`
        ),
      }

      const response = await fetch(`${API_BASE}/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationPayload),
      })
      
      if (!response.ok) {
        throw new Error(`Registration failed: ${response.statusText}`)
      }
      
      navigate(`/regattas/${regattaId}/payment`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit registration')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
          <p className="mt-4 text-blue-200">Loading regatta details...</p>
        </div>
      </div>
    )
  }

  if (error || !regatta) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8 bg-white/10 backdrop-blur-md rounded-xl shadow-sm border border-white/20">
          <p className="text-red-300 mb-4">{error || 'Regatta not found'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      {/* Background overlay */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/92 via-blue-800/88 to-cyan-700/85"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Register for {regatta.name}</h1>
          <p className="mt-2 text-blue-200">{regatta.scoring_class} • {new Date(regatta.start_date).toLocaleDateString()}</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-400/30 rounded-lg text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Club Selection */}
          <section className="bg-white/10 backdrop-blur-md rounded-xl shadow-sm border border-white/20 p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              🏢 Organizing Club
            </h2>
            
            {clubsLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
                <span className="ml-3 text-blue-200">Loading clubs...</span>
              </div>
            ) : (
              <div>
                <label htmlFor="club" className="block text-sm font-medium text-blue-200 mb-1">
                  Select Club *
                </label>
                <select
                  id="club"
                  value={selectedClubId}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all outline-none ${formErrors.club ? 'border-red-400 bg-white/5 text-white placeholder-blue-300' : 'border-white/10 bg-white/5 text-white placeholder-blue-300'} disabled:bg-white/5`}
                >
                  <option value="">-- Select a club --</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}{club.federation_code ? ` (${club.federation_code})` : ''} — {club.city || club.address || 'No location'}
                    </option>
                  ))}
                </select>
                {formErrors.club && <p className="mt-1 text-sm text-red-400">{formErrors.club}</p>}
              </div>
            )}
          </section>

          {/* Section 2: Boat Details */}
          <section className="bg-white/10 backdrop-blur-md rounded-xl shadow-sm border border-white/20 p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              🚢 Boat Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1">
                  Boat Name *
                </label>
                <input
                  type="text"
                  value={boatDetails.boatName}
                  onChange={(e) => setBoatDetails(prev => ({ ...prev, boatName: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all outline-none ${formErrors.boatName ? 'border-red-400 bg-white/5 text-white placeholder-blue-300' : 'border-white/10 bg-white/5 text-white placeholder-blue-300'} disabled:bg-white/5`}
                  placeholder="Enter boat name"
                />
                {formErrors.boatName && <p className="mt-1 text-sm text-red-400">{formErrors.boatName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1">
                  Sail Number *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={boatDetails.sailNumber}
                    onChange={(e) => setBoatDetails(prev => ({ ...prev, sailNumber: e.target.value }))}
                    className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all outline-none ${formErrors.sailNumber ? 'border-red-400 bg-white/5 text-white placeholder-blue-300' : 'border-white/10 bg-white/5 text-white placeholder-blue-300'} disabled:bg-white/5`}
                    placeholder="e.g., ITA 1234"
                  />
                  <button
                    type="button"
                    onClick={handleSailNumberLookup}
                    className="px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/30 whitespace-nowrap border border-cyan-400/20 transition-colors"
                  >
                    Lookup Rating
                  </button>
                </div>
                {formErrors.sailNumber && <p className="mt-1 text-sm text-red-400">{formErrors.sailNumber}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1">Hull ID</label>
                <input
                  type="text"
                  value={boatDetails.hullId}
                  onChange={(e) => setBoatDetails(prev => ({ ...prev, hullId: e.target.value }))}
                  className="w-full px-3 py-2 border border-white/10 bg-white/5 text-white rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all outline-none placeholder-blue-300"
                  placeholder="Hull identification number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1">Class Type</label>
                <select
                  value={boatDetails.classType}
                  onChange={(e) => setBoatDetails(prev => ({ ...prev, classType: e.target.value }))}
                  className="w-full px-3 py-2 border border-white/10 bg-white/5 text-white rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all outline-none"
                >
                  <option value="one-design">One Design</option>
                  <option value="orcc">ORC Club</option>
                  <option value="orcinternational">ORC International</option>
                  <option value="irc">IRC</option>
                  <option value="phrf">PHRF</option>
                </select>
              </div>
            </div>

            {/* Certificate Upload Section */}
            <div className="mt-6 p-4 bg-cyan-500/10 rounded-lg border border-cyan-400/20">
              <h3 className="font-medium text-cyan-300 mb-2">Rating Certificate</h3>
              
              {certificateInfo.ircRating && (
                <p className="text-sm text-green-300 mb-2">✓ IRC Rating: {certificateInfo.ircRating}</p>
              )}
              
              <div className="flex items-center gap-4">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.xml,.json"
                    onChange={(e) => e.target.files?.[0] && handleCertificateUpload(e.target.files[0])}
                    className="hidden"
                  />
                  <span className="px-4 py-2 bg-white/5 border border-cyan-400/30 rounded-lg text-cyan-300 hover:bg-white/10 transition-colors">
                    Upload Certificate (PDF/XML)
                  </span>
                </label>
                
                {certificateInfo.orcCertificateUrl && (
                  <p className="text-sm text-green-300">✓ Certificate uploaded</p>
                )}
              </div>
            </div>
          </section>

          {/* Section 3: Crew Roster */}
          <section className="bg-white/10 backdrop-blur-md rounded-xl shadow-sm border border-white/20 p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              👥 Crew Roster *
            </h2>
            
            {formErrors.crew && <p className="mb-4 text-sm text-red-400">{formErrors.crew}</p>}
            
            {/* Existing crew list */}
            {crewMembers.length > 0 && (
              <div className="space-y-2 mb-4">
                {crewMembers.map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                    <div>
                      <p className="font-medium text-white">{member.name}</p>
                      <p className="text-sm text-blue-200">{member.role} • {member.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCrewMember(index)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new crew member */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white/5 rounded-lg">
              <input
                type="text"
                value={newCrewMember.name}
                onChange={(e) => setNewCrewMember(prev => ({ ...prev, name: e.target.value }))}
                className="px-3 py-2 border border-white/10 bg-white/5 text-white rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all outline-none placeholder-blue-300"
                placeholder="Crew member name"
              />
              <input
                type="email"
                value={newCrewMember.email}
                onChange={(e) => setNewCrewMember(prev => ({ ...prev, email: e.target.value }))}
                className="px-3 py-2 border border-white/10 bg-white/5 text-white rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all outline-none placeholder-blue-300"
                placeholder="Email address"
              />
              <input
                type="text"
                value={newCrewMember.phone}
                onChange={(e) => setNewCrewMember(prev => ({ ...prev, phone: e.target.value }))}
                className="px-3 py-2 border border-white/10 bg-white/5 text-white rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all outline-none placeholder-blue-300"
                placeholder="Phone number"
              />
              <select
                value={newCrewMember.role}
                onChange={(e) => setNewCrewMember(prev => ({ ...prev, role: e.target.value }))}
                className="px-3 py-2 border border-white/10 bg-white/5 text-white rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all outline-none"
              >
                <option value="skipper">Skipper</option>
                <option value="crew">Crew</option>
                <option value="tactician">Tactician</option>
                <option value="helm">Helm</option>
                <option value="grinder">Grinder</option>
              </select>
            </div>
            
            {formErrors.newCrew && <p className="mt-1 text-sm text-red-400">{formErrors.newCrew}</p>}
            
            <button
              type="button"
              onClick={addCrewMember}
              className="mt-4 px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/30 flex items-center gap-2 border border-cyan-400/20 transition-colors"
            >
              + Add Crew Member
            </button>
          </section>

          {/* Section 4: Emergency Contact */}
          <section className="bg-white/10 backdrop-blur-md rounded-xl shadow-sm border border-white/20 p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              🚨 Emergency Contact
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={emergencyContact.name}
                  onChange={(e) => setEmergencyContact(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all outline-none ${formErrors.emergencyName ? 'border-red-400 bg-white/5 text-white placeholder-blue-300' : 'border-white/10 bg-white/5 text-white placeholder-blue-300'} disabled:bg-white/5`}
                  placeholder="Emergency contact name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={emergencyContact.phone}
                  onChange={(e) => setEmergencyContact(prev => ({ ...prev, phone: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all outline-none ${formErrors.emergencyPhone ? 'border-red-400 bg-white/5 text-white placeholder-blue-300' : 'border-white/10 bg-white/5 text-white placeholder-blue-300'} disabled:bg-white/5`}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-blue-200 mb-1">Medical Conditions</label>
              <textarea
                value={medicalConditions}
                onChange={(e) => setMedicalConditions(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-white/10 bg-white/5 text-white rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all outline-none placeholder-blue-300"
                placeholder="List any relevant medical conditions or allergies"
              />
            </div>
          </section>

          {/* Section 5: Legal Documents */}
          <section className="bg-white/10 backdrop-blur-md rounded-xl shadow-sm border border-white/20 p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              📝 Legal Documents
            </h2>
            
            {formErrors.charterSignature && (
              <p className="mb-4 text-sm text-red-400">{formErrors.charterSignature}</p>
            )}
            
            {/* Charter Agreement */}
            {charterAgreementSigned ? (
              <div className="p-4 bg-green-500/20 border border-green-400/30 rounded-lg mb-4">
                <p className="text-green-300 font-medium">✓ Charter Agreement Signed</p>
              </div>
            ) : (
              <ESignatureCanvas
                documentTitle="Charter Agreement"
                onSignatureComplete={(data) => {
                  setCharterAgreementSigned(true)
                  setCharterSignatureData(data)
                }}
                required={true}
              />
            )}

            {/* Liability Waiver */}
            {formErrors.waiverSignature && (
              <p className="mt-4 mb-2 text-sm text-red-400">{formErrors.waiverSignature}</p>
            )}
            
            {liabilityWaiverSigned ? (
              <div className="p-4 bg-green-500/20 border border-green-400/30 rounded-lg">
                <p className="text-green-300 font-medium">✓ Liability Waiver Signed</p>
              </div>
            ) : (
              <ESignatureCanvas
                documentTitle="Liability Waiver"
                onSignatureComplete={(data) => {
                  setLiabilityWaiverSigned(true)
                  setWaiverSignatureData(data)
                }}
                required={true}
              />
            )}
          </section>

          {/* Submit Button */}
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 text-blue-200 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={submitting}
              className={`px-8 py-3 ${
                submitting
                  ? 'bg-cyan-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg font-bold shadow-md transition-all'
              } disabled:opacity-50`}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  Submitting...
                </span>
              ) : (
                'Complete Registration'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegattaRegistrationPage