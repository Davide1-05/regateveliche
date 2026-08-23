import { useState, useEffect } from 'react'
import axios from 'axios'
import backgroundImg from '../images/background.png'
import { Link, useNavigate } from 'react-router-dom'
import BuoyMapManager from '../components/BuoyMapManager'

interface Regatta {
  id: string
  name: string
  code: string
  organizer_id: string | null
  start_date: string
  end_date: string
  latitude: number | null
  longitude: number | null
  scoring_class: string
  status: string
  created_at: string
}

interface Club {
  id: string
  name: string
  federation_code: string | null
  email: string
  phone: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  certification_level: string
  created_at: string
}

interface Buoy {
  id?: string
  regatta_id: string
  race_id?: string | null
  mark_letter: string
  mark_type: 'windward' | 'leeward' | 'gate_left' | 'gate_right' | 'finish'
  latitude: number
  longitude: number
  is_robotic: boolean
  device_id?: string | null
}

interface CrewMemberView {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  status: string
}

interface RegistrationEntry {
  id: string
  sail_number: string
  boat_class: string
  hull_number?: string
  skipper_name: string
  status: string
  registered_at: string
  crew_count: number
  crew_members: CrewMemberView[]
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const DEFAULT_CENTER_LAT = 44.0
const DEFAULT_CENTER_LON = 10.0

export function RegattasPage() {
  const navigate = useNavigate()
  const [regattas, setRegattas] = useState<Regatta[]>([])
  const [filteredRegattas, setFilteredRegattas] = useState<Regatta[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [clubFilter, setClubFilter] = useState<string>('all')

  // Modals and Forms
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRegatta, setEditingRegatta] = useState<Regatta | null>(null)

  // Race Course Map View
  const [activeMapRegatta, setActiveMapRegatta] = useState<Regatta | null>(null)
  const [buoys, setBuoys] = useState<Buoy[]>([])

  // Entries / Crew Modal
  const [selectedRegattaForEntries, setSelectedRegattaForEntries] = useState<Regatta | null>(null)
  const [entries, setEntries] = useState<RegistrationEntry[]>([])
  const [entriesLoading, setEntriesLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    organizer_id: '',
    start_date: '',
    end_date: '',
    latitude: '',
    longitude: '',
    scoring_class: 'ORC',
    status: 'planning',
  })

  useEffect(() => {
    fetchRegattas()
    fetchClubs()
  }, [])

  // Filter application
  useEffect(() => {
    let filtered = regattas

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        r => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter)
    }

    if (clubFilter !== 'all') {
      filtered = filtered.filter(r => r.organizer_id === clubFilter)
    }

    setFilteredRegattas(filtered)
  }, [regattas, searchQuery, statusFilter, clubFilter])

  const fetchRegattas = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_BASE_URL}/regattas`)
      setRegattas(response.data.regattas || [])
    } catch (error: any) {
      console.error('Failed to fetch regattas:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClubs = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/clubs`)
      setClubs(response.data.clubs || [])
    } catch (error: any) {
      console.error('Failed to fetch clubs:', error)
    }
  }

  const fetchBuoys = async (regattaId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/regattas/${regattaId}/marks`)
      setBuoys(response.data.marks || [])
    } catch (error: any) {
      console.error('Failed to fetch buoys:', error)
    }
  }

  const fetchEntries = async (regatta: Regatta) => {
    try {
      setSelectedRegattaForEntries(regatta)
      setEntriesLoading(true)
      const response = await axios.get(`${API_BASE_URL}/registrations/regatta/${regatta.id}/entries`)
      setEntries(response.data.entries || [])
    } catch (error) {
      console.error('Failed to fetch entries:', error)
      setEntries([])
    } finally {
      setEntriesLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token')
      const payload: any = { ...formData }
      if (formData.latitude) payload.latitude = parseFloat(formData.latitude)
      if (formData.longitude) payload.longitude = parseFloat(formData.longitude)

      const response = await axios.post(`${API_BASE_URL}/regattas`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const newRegatta = response.data.regatta || response.data
      setShowCreateModal(false)
      setFormData({
        name: '', code: '', organizer_id: '', start_date: '', end_date: '',
        latitude: '', longitude: '', scoring_class: 'ORC', status: 'planning',
      })
      await fetchRegattas()

      if (newRegatta?.id) {
        openCourseMap(newRegatta)
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create regatta')
    }
  }

  const handleUpdate = async () => {
    if (!editingRegatta) return
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token')
      const payload: any = { ...formData }
      if (formData.latitude) payload.latitude = parseFloat(formData.latitude)
      if (formData.longitude) payload.longitude = parseFloat(formData.longitude)

      await axios.put(`${API_BASE_URL}/regattas/${editingRegatta.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      })

      setEditingRegatta(null)
      fetchRegattas()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to update regatta')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this regatta?')) return
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token')
      await axios.delete(`${API_BASE_URL}/regattas/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchRegattas()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete regatta')
    }
  }

  const openEdit = (regatta: Regatta) => {
    setEditingRegatta(regatta)
    setFormData({
      name: regatta.name,
      code: regatta.code,
      organizer_id: regatta.organizer_id || '',
      start_date: regatta.start_date.split('T')[0],
      end_date: regatta.end_date.split('T')[0],
      latitude: regatta.latitude?.toString() || '',
      longitude: regatta.longitude?.toString() || '',
      scoring_class: regatta.scoring_class,
      status: regatta.status,
    })
  }

  const openCourseMap = async (regatta: Regatta) => {
    setActiveMapRegatta(regatta)
    await fetchBuoys(regatta.id)
  }

  const closeCourseMap = () => {
    setActiveMapRegatta(null)
    fetchRegattas()
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      planning: 'bg-gray-100 text-gray-800 border-gray-300',
      open: 'bg-green-100 text-green-800 border-green-300',
      closed: 'bg-red-100 text-red-800 border-red-300',
      active: 'bg-blue-100 text-blue-800 border-blue-300',
      completed: 'bg-purple-100 text-purple-800 border-purple-300',
    }
    return badges[status] || badges.planning
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
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

      <div className="relative z-10 container mx-auto px-4 max-w-7xl">
        {/* ========================================================================= */}
        {/* RACE COURSE MAP VIEW                                                      */}
        {/* ========================================================================= */}
        {activeMapRegatta ? (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                  🗺️ Place Race Course Marks
                </h1>
                <p className="text-blue-200 mt-1">Regatta: {activeMapRegatta.name}</p>
              </div>
              <button
                onClick={closeCourseMap}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm hover:bg-white/15 text-white transition-colors"
              >
                ← Back to Regattas
              </button>
            </div>

            {/* Leaflet Map */}
            <div className="h-[calc(100vh-340px)] min-h-[550px] rounded-xl overflow-hidden shadow-lg border border-white/10">
              <BuoyMapManager
                regattaId={activeMapRegatta.id}
                centerLat={activeMapRegatta.latitude ?? DEFAULT_CENTER_LAT}
                centerLon={activeMapRegatta.longitude ?? DEFAULT_CENTER_LON}
                zoom={14}
                initialBuoys={buoys}
                onSave={(b) => setBuoys(b)}
              />
            </div>

            {/* Centered Large Confirm Button */}
            <div className="mt-8 mb-6 flex justify-center">
              <button
                type="button"
                onClick={closeCourseMap}
                className="px-8 py-3.5 bg-white/10 border border-white/20 text-blue-100 hover:bg-white/20 rounded-xl text-base font-semibold transition-all shadow-lg flex items-center gap-2 backdrop-blur-sm"
              >
                Confirm Marks Placement ✓
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* MAIN REGATTAS LIST VIEW                                                   */
          /* ========================================================================= */
          <div>
            <header className="mb-8 flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  🏁 Regatta Management
                </h1>
                <p className="text-blue-200 mt-2">Create, manage and monitor sailing regattas</p>
              </div>
              <Link to="/dashboard" className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white hover:bg-white/15 transition-colors">
                ← Back to Dashboard
              </Link>
            </header>

            {/* FILTER BAR */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-4 mb-6">
              <div className="flex flex-wrap gap-4 items-center">
                <input
                  type="text"
                  placeholder="Search regattas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-1.5 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 outline-none cursor-pointer [&>option]:bg-slate-800 [&>option]:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="planning">Planning</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>

                <select
                  value={clubFilter}
                  onChange={(e) => setClubFilter(e.target.value)}
                  className="px-3 py-1.5 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 outline-none cursor-pointer [&>option]:bg-slate-800 [&>option]:text-white"
                >
                  <option value="all">All Clubs</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>{club.name}</option>
                  ))}
                </select>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="ml-auto px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  + New Regatta
                </button>
              </div>
            </div>

            {/* Regattas Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRegattas.map((regatta) => (
                <div key={regatta.id} className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6 flex flex-col justify-between hover:bg-white/15 transition-colors">
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg text-white">{regatta.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(regatta.status)}`}>
                        {regatta.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-blue-300 mb-3">Code: {regatta.code}</p>
                    <p className="text-xs text-blue-200 mb-4">
                      📅 {new Date(regatta.start_date).toLocaleDateString()} - {new Date(regatta.end_date).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="space-y-2 pt-4 border-t border-white/10">
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/regattas/${regatta.id}/register`)}
                        className="flex-1 px-3 py-1.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/30 rounded-lg text-xs font-semibold transition-colors"
                      >
                        ⛵ Register
                      </button>

                      <button
                        onClick={() => fetchEntries(regatta)}
                        className="flex-1 px-3 py-1.5 bg-amber-500/20 border border-amber-400/30 text-amber-300 hover:bg-amber-500/30 rounded-lg text-xs font-semibold transition-colors"
                      >
                        👥 Entries
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => openCourseMap(regatta)}
                        className="flex-1 px-3 py-1.5 bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/30 rounded-lg text-xs transition-colors"
                      >
                        🗺️ Course Map
                      </button>

                      <button
                        onClick={() => openEdit(regatta)}
                        className="px-3 py-1.5 bg-white/10 border border-white/20 text-blue-100 hover:bg-white/20 rounded-lg text-xs transition-colors"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(regatta.id)}
                        className="px-3 py-1.5 bg-red-500/20 border border-red-400/30 text-red-300 hover:bg-red-500/30 rounded-lg text-xs transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: EDIT REGATTA                                                       */}
        {/* ========================================================================= */}
        {editingRegatta && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 w-full max-w-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Edit Regatta</h2>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                />
                <input
                  type="text"
                  placeholder="Code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                />
                <select
                  value={formData.organizer_id}
                  onChange={(e) => setFormData({ ...formData, organizer_id: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 outline-none cursor-pointer [&>option]:bg-slate-800 [&>option]:text-white"
                >
                  <option value="">Select a Club (Organizer)</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>{club.name}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 outline-none"
                />
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 outline-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Latitude"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Longitude"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                  />
                </div>
                <select
                  value={formData.scoring_class}
                  onChange={(e) => setFormData({ ...formData, scoring_class: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 outline-none cursor-pointer [&>option]:bg-slate-800 [&>option]:text-white"
                >
                  <option value="ORC">ORC</option>
                  <option value="IRC">IRC</option>
                  <option value="PHRF">PHRF</option>
                </select>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 outline-none cursor-pointer [&>option]:bg-slate-800 [&>option]:text-white"
                >
                  <option value="planning">Planning</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingRegatta(null)}
                  className="flex-1 px-4 py-2 bg-white/10 border border-white/20 text-blue-100 hover:bg-white/20 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdate}
                  className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: CREATE REGATTA                                                     */}
        {/* ========================================================================= */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 w-full max-w-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Create New Regatta</h2>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                />
                <input
                  type="text"
                  placeholder="Code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                />
                <select
                  value={formData.organizer_id}
                  onChange={(e) => setFormData({ ...formData, organizer_id: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 outline-none cursor-pointer [&>option]:bg-slate-800 [&>option]:text-white"
                >
                  <option value="">Select a Club (Organizer)</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>{club.name}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 outline-none"
                />
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 outline-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Latitude"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Longitude"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300 outline-none"
                  />
                </div>
                <select
                  value={formData.scoring_class}
                  onChange={(e) => setFormData({ ...formData, scoring_class: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 outline-none cursor-pointer [&>option]:bg-slate-800 [&>option]:text-white"
                >
                  <option value="ORC">ORC</option>
                  <option value="IRC">IRC</option>
                  <option value="PHRF">PHRF</option>
                </select>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 outline-none cursor-pointer [&>option]:bg-slate-800 [&>option]:text-white"
                >
                  <option value="planning">Planning</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-white/10 border border-white/20 text-blue-100 hover:bg-white/20 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Create & Place Marks
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: REGISTERED BOATS & CREWS VIEW (GLASSMORPHISM UNIFORMATO)           */}
        {/* ========================================================================= */}
        {selectedRegattaForEntries && (
          <div className="fixed inset-0 bg-blue-950/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
              {/* Modal Header */}
              <div className="p-5 border-b border-white/15 flex justify-between items-center bg-white/5">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    ⛵ Registered Boats & Crews
                  </h2>
                  <p className="text-xs text-blue-200 mt-0.5">{selectedRegattaForEntries.name}</p>
                </div>
                <button
                  onClick={() => setSelectedRegattaForEntries(null)}
                  className="px-3 py-1.5 bg-white/10 border border-white/20 text-blue-100 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors"
                >
                  ✕ Close
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {entriesLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
                    <p className="text-sm text-blue-200 mt-3">Loading entries...</p>
                  </div>
                ) : entries.length === 0 ? (
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/15 p-12 text-center text-blue-200">
                    <span className="text-4xl block mb-3">⚓</span>
                    <p className="text-base font-semibold text-white">No entries found</p>
                    <p className="text-xs text-blue-300 mt-1">No boats registered for this regatta yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-sm"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold text-cyan-300">{entry.sail_number}</span>
                              <span className="text-xs px-2 py-0.5 bg-white/10 border border-white/20 text-blue-100 rounded">
                                {entry.boat_class}
                              </span>
                            </div>
                            <p className="text-xs text-blue-200 mt-1.5">
                              Skipper / Owner: <b className="text-white font-medium">{entry.skipper_name}</b>
                            </p>
                          </div>
                          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-semibold">
                            {entry.crew_count} on board
                          </span>
                        </div>

                        {/* Crew Members List */}
                        <div className="mt-4 pt-3 border-t border-white/10">
                          <h4 className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-2.5">
                            Crew Members ({entry.crew_members.length}):
                          </h4>
                          {entry.crew_members.length === 0 ? (
                            <p className="text-xs text-blue-200/60 italic">No detailed crew list registered.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {entry.crew_members.map((c) => (
                                <div
                                  key={c.id}
                                  className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex justify-between items-center text-xs"
                                >
                                  <div>
                                    <p className="font-semibold text-white">{c.name}</p>
                                    <p className="text-[11px] text-blue-200/70">{c.email}</p>
                                  </div>
                                  <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-500/30 rounded text-[10px] uppercase font-bold tracking-wider">
                                    {c.role}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RegattasPage