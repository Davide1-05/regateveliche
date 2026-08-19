import { useState, useEffect } from 'react'
import axios from 'axios'
import backgroundImg from '../images/background.png'
import { Link } from 'react-router-dom'
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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Default coordinates for Mediterranean sailing area (if not specified)
const DEFAULT_CENTER_LAT = 44.0
const DEFAULT_CENTER_LON = 10.0

export function RegattasPage() {
  const [regattas, setRegattas] = useState<Regatta[]>([])
  const [filteredRegattas, setFilteredRegattas] = useState<Regatta[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [clubFilter, setClubFilter] = useState<string>('all')
  
  // Regatta form state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRegatta, setEditingRegatta] = useState<Regatta | null>(null)
  const [createdRegattaId, setCreatedRegattaId] = useState<string | null>(null)
  
  // Buoy management state
  const [buoys, setBuoys] = useState<Buoy[]>([])
  const [showBuoyMap, setShowBuoyMap] = useState(false)
  
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

  // Fetch buoys when viewing a regatta or after creation
  useEffect(() => {
    if (createdRegattaId) {
      fetchBuoys(createdRegattaId)
    }
  }, [createdRegattaId])

  // Update form coordinates when map is opened (sync with map center)
  useEffect(() => {
    if (showBuoyMap && createdRegattaId) {
      const regatta = regattas.find(r => r.id === createdRegattaId)
      const lat = regatta?.latitude
      const lon = regatta?.longitude
      // Update form coordinates from map center if not already set
      if (lat != null && lon != null) {
        setFormData(prev => ({
          ...prev,
          latitude: prev.latitude || lat.toString(),
          longitude: prev.longitude || lon.toString(),
        }))
      }
    }
  }, [showBuoyMap, createdRegattaId])

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

  const handleCreate = async () => {
    try {
      const token = localStorage.getItem('access_token')
      
      // Prepare payload with proper coordinate conversion
      const payload: any = { ...formData }
      if (formData.latitude) {
        payload.latitude = parseFloat(formData.latitude)
      }
      if (formData.longitude) {
        payload.longitude = parseFloat(formData.longitude)
      }
      
      const response = await axios.post(`${API_BASE_URL}/regattas`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      // Store the created regatta ID and show buoy map
      setCreatedRegattaId(response.data.regatta?.id || response.data.id)
      setShowCreateModal(false)
      setShowBuoyMap(true)
      
      // Reset form but keep coordinates if provided
      setFormData({
        name: '', code: '', organizer_id: '', start_date: '', end_date: '',
        latitude: formData.latitude || '', longitude: formData.longitude || '',
        scoring_class: 'ORC', status: 'planning',
      })
      
      fetchRegattas()
    } catch (error: any) {
      console.error('Failed to create regatta:', error)
      alert(error.response?.data?.detail || 'Failed to create regatta')
    }
  }

  const handleUpdate = async () => {
    if (!editingRegatta) return
    try {
      const token = localStorage.getItem('access_token')
      
      // Prepare payload with proper coordinate conversion
      const payload: any = { ...formData }
      if (formData.latitude) {
        payload.latitude = parseFloat(formData.latitude)
      }
      if (formData.longitude) {
        payload.longitude = parseFloat(formData.longitude)
      }
      
      await axios.put(`${API_BASE_URL}/regattas/${editingRegatta.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      setEditingRegatta(null)
      fetchRegattas()
    } catch (error: any) {
      console.error('Failed to update regatta:', error)
      alert(error.response?.data?.detail || 'Failed to update regatta')
    }
  }

  // Fetch buoys for a regatta
  const fetchBuoys = async (regattaId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/regattas/${regattaId}/marks`)
      setBuoys(response.data.marks || [])
    } catch (error: any) {
      console.error('Failed to fetch buoys:', error)
    }
  }

  // Handle buoy save from BuoyMapManager
  const handleBuoySave = async (savedBuoys: Buoy[]) => {
    setBuoys(savedBuoys)
    // Also update parent state if needed
    if (onBuoySave) {
      onBuoySave(savedBuoys)
    }
  }

  // Callback for buoy changes from child components
  const onBuoySave: ((buoys: Buoy[]) => void) | undefined = undefined

  // Open regatta and show buoy map (for both new and existing regattas)
  const openRegattaWithMap = async (regatta: Regatta) => {
    setEditingRegatta(regatta)
    // Set createdRegattaId so BuoyMapManager shows the correct regatta
    setCreatedRegattaId(regatta.id)
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
    // Fetch buoys first before showing map
    await fetchBuoys(regatta.id)
  }

  // Close buoy map and return to list
  const closeBuoyMap = () => {
    setShowBuoyMap(false)
    setCreatedRegattaId(null)
    setEditingRegatta(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this regatta?')) return
    try {
      const token = localStorage.getItem('access_token')
      await axios.delete(`${API_BASE_URL}/regattas/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchRegattas()
    } catch (error: any) {
      console.error('Failed to delete regatta:', error)
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
      {/* Background overlay */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/92 via-blue-800/88 to-cyan-700/85"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 max-w-7xl">
        {(showBuoyMap || editingRegatta) && createdRegattaId ? (
          // Buoy Map View - Full screen map for buoy placement
          <div className="mt-4">
            {/* Map Header */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                  🗺️ Place Race Course Marks
                </h1>
                <p className="text-blue-200 mt-1">Click on the map to place buoys for regatta: {editingRegatta?.name || 'New Regatta'}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closeBuoyMap}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm hover:bg-white/15 transition-colors text-white"
                >
                  ← Back to Regattas
                </button>
              </div>
            </div>

            {/* Buoy count summary */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-3 mb-4 flex gap-6">
              {(['windward', 'leeward', 'gate_left', 'gate_right', 'finish'] as const).map((type) => (
                <div key={type} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: {
                      windward: '#ef4444',
                      leeward: '#3b82f6',
                      gate_left: '#10b981',
                      gate_right: '#f59e0b',
                      finish: '#8b5cf6',
                    }[type] }}
                  />
                  <span className="text-blue-200 capitalize">{type.replace('_', ' ')}</span>
                  <span className="font-semibold text-white">
                    {buoys.filter(b => b.mark_type === type).length}
                  </span>
                </div>
              ))}
            </div>

            {/* Map Component */}
            <div className="h-[calc(100vh-280px)] min-h-[600px]">
              <BuoyMapManager
                regattaId={createdRegattaId}
                centerLat={parseFloat(formData.latitude) || (editingRegatta?.latitude ?? DEFAULT_CENTER_LAT)}
                centerLon={parseFloat(formData.longitude) || (editingRegatta?.longitude ?? DEFAULT_CENTER_LON)}
                zoom={14}
                initialBuoys={buoys}
                onSave={handleBuoySave}
              />
            </div>

            {/* Quick actions below map */}
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={async () => {
                  // Save any pending buoy changes before closing
                  if (createdRegattaId) {
                    await fetchBuoys(createdRegattaId)
                  }
                  closeBuoyMap()
                }}
                className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
              >
                ✓ Done Placing Buoys
              </button>
            </div>
          </div>
        ) : (
          // Regular Regatta List View
          <div>
            {/* Header */}
            <header className="mb-8">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    🏁 Regatta Management
                  </h1>
                  <p className="text-blue-200 mt-2">Create, manage and monitor sailing regattas</p>
                </div>
                <Link to="/dashboard" className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm hover:bg-white/15 transition-colors">
                  ← Back to Dashboard
                </Link>
              </div>
            </header>

            {/* Filters */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-4 mb-6">
              <div className="flex flex-wrap gap-4 items-center">
                <input
                  type="text"
                  placeholder="Search regattas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-1.5 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100"
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
                  className="px-3 py-1.5 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100"
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

            {/* Regatta List */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRegattas.length === 0 ? (
                <div className="md:col-span-2 lg:col-span-3 bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-12 text-center">
                  <span className="text-4xl mb-4 block">🏁</span>
                  <p className="text-blue-200">{searchQuery ? 'No regattas match your search' : 'No regattas found'}</p>
                </div>
              ) : (
                filteredRegattas.map((regatta) => {
                  const hasMarks = buoys.some(b => b.regatta_id === regatta.id)
                  
                  return (
                    <div key={regatta.id} className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-6 hover:bg-white/15 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-lg text-white">{regatta.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(regatta.status)}`}>
                          {regatta.status.toUpperCase()}
                        </span>
                      </div>

                      <p className="text-sm text-blue-300 mb-4">Code: {regatta.code}</p>

                      <div className="space-y-2 text-sm text-blue-200 mb-4">
                        <p>📅 {new Date(regatta.start_date).toLocaleDateString()} - {new Date(regatta.end_date).toLocaleDateString()}</p>
                        <p>⛵ Scoring: {regatta.scoring_class}</p>
                        {hasMarks && (
                          <p className="text-xs text-green-300">✓ Marks placed</p>
                        )}
                        {regatta.organizer_id && (
                          <p className="text-xs text-blue-300">Organizer ID: {regatta.organizer_id}</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => openRegattaWithMap(regatta)}
                          className="flex-1 px-3 py-1.5 bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 rounded-lg text-sm hover:bg-cyan-500/30 transition-colors"
                        >
                          🗺️ Course Map
                        </button>
                        <button onClick={() => handleDelete(regatta.id)} className="px-3 py-1.5 bg-red-500/20 border border-red-400/30 text-red-300 rounded-lg text-sm hover:bg-red-500/30 transition-colors">
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 w-full max-w-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Create New Regatta</h2>

              <div className="space-y-3">
                <input type="text" placeholder="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
                <input type="text" placeholder="Code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
                <select value={formData.organizer_id} onChange={(e) => setFormData({ ...formData, organizer_id: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400">
                  <option value="">Select a Club (Organizer)</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>{club.name}</option>
                  ))}
                </select>
                <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
                <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Latitude" value={formData.latitude} onChange={(e) => setFormData({ ...formData, latitude: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
                  <input type="text" placeholder="Longitude" value={formData.longitude} onChange={(e) => setFormData({ ...formData, longitude: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
                </div>
                <select value={formData.scoring_class} onChange={(e) => setFormData({ ...formData, scoring_class: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400">
                  <option value="ORC">ORC</option>
                  <option value="IRC">IRC</option>
                  <option value="PHRF">PHRF</option>
                </select>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400">
                  <option value="planning">Planning</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">Cancel</button>
                <button onClick={handleCreate} className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors">Create & Place Marks</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal - Only shown when NOT in buoy map mode */}
        {editingRegatta && !showBuoyMap && !createdRegattaId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 w-full max-w-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Edit Regatta</h2>

              <div className="space-y-3">
                <input type="text" placeholder="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
                <input type="text" placeholder="Code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
                <select value={formData.organizer_id} onChange={(e) => setFormData({ ...formData, organizer_id: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400">
                  <option value="">Select a Club (Organizer)</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>{club.name}</option>
                  ))}
                </select>
                <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
                <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Latitude" value={formData.latitude} onChange={(e) => setFormData({ ...formData, latitude: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
                  <input type="text" placeholder="Longitude" value={formData.longitude} onChange={(e) => setFormData({ ...formData, longitude: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
                </div>
                <select value={formData.scoring_class} onChange={(e) => setFormData({ ...formData, scoring_class: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400">
                  <option value="ORC">ORC</option>
                  <option value="IRC">IRC</option>
                  <option value="PHRF">PHRF</option>
                </select>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400">
                  <option value="planning">Planning</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setEditingRegatta(null); setCreatedRegattaId(null) }} className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">Cancel</button>
                <button onClick={async () => { await handleUpdate(); closeBuoyMap() }} className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors">Save Changes</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RegattasPage