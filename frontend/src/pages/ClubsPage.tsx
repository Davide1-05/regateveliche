import { useState, useEffect } from 'react'
import axios from 'axios'
import backgroundImg from '../images/background.png'
import { Link } from 'react-router-dom'

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

interface ClubMember {
  id: string
  user_id: string
  club_id: string
  role: string
  created_at: string
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [certificationFilter, setCertificationFilter] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingClub, setEditingClub] = useState<Club | null>(null)
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null)
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    federation_code: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    certification_level: 'bronze',
  })

  useEffect(() => {
    fetchClubs()
  }, [])

  useEffect(() => {
    let filtered = clubs

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
      )
    }

    if (certificationFilter !== 'all') {
      filtered = filtered.filter(c => c.certification_level === certificationFilter)
    }

    setFilteredClubs(filtered)
  }, [clubs, searchQuery, certificationFilter])

  const fetchClubs = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_BASE_URL}/clubs`)
      setClubs(response.data.clubs || [])
    } catch (error: any) {
      console.error('Failed to fetch clubs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClubMembers = async (clubId: string) => {
    try {
      setLoadingMembers(true)
      setSelectedClubId(clubId)
      const response = await axios.get(`${API_BASE_URL}/clubs/${clubId}/members`)
      setClubMembers(response.data.memberships || [])
    } catch (error: any) {
      console.error('Failed to fetch club members:', error)
    } finally {
      setLoadingMembers(false)
    }
  }

  const handleCreate = async () => {
    try {
      const token = localStorage.getItem('access_token')
      await axios.post(`${API_BASE_URL}/clubs`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setShowCreateModal(false)
      setFormData({
        name: '', federation_code: '', email: '', phone: '', address: '', city: '', postal_code: '', certification_level: 'bronze',
      })
      fetchClubs()
    } catch (error: any) {
      console.error('Failed to create club:', error)
      alert(error.response?.data?.detail || 'Failed to create club')
    }
  }

  const handleUpdate = async () => {
    if (!editingClub) return
    try {
      const token = localStorage.getItem('access_token')
      await axios.put(`${API_BASE_URL}/clubs/${editingClub.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setEditingClub(null)
      fetchClubs()
    } catch (error: any) {
      console.error('Failed to update club:', error)
      alert(error.response?.data?.detail || 'Failed to update club')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this club?')) return
    try {
      const token = localStorage.getItem('access_token')
      await axios.delete(`${API_BASE_URL}/clubs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchClubs()
    } catch (error: any) {
      console.error('Failed to delete club:', error)
      alert(error.response?.data?.detail || 'Failed to delete club')
    }
  }

  const openEdit = (club: Club) => {
    setEditingClub(club)
    setFormData({
      name: club.name,
      federation_code: club.federation_code || '',
      email: club.email,
      phone: club.phone || '',
      address: club.address || '',
      city: club.city || '',
      postal_code: club.postal_code || '',
      certification_level: club.certification_level,
    })
  }

  const getCertificationBadge = (level: string) => {
    const badges: Record<string, string> = {
      bronze: 'bg-amber-100 text-amber-800 border-amber-300',
      silver: 'bg-gray-200 text-gray-700 border-gray-400',
      gold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      platinum: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    }
    return badges[level] || badges.bronze
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
      <div className="relative z-10 container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                🏛️ Club Management
              </h1>
              <p className="text-blue-200 mt-2">Manage sailing clubs and memberships</p>
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
              placeholder="Search clubs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100 placeholder-blue-300"
            />

            <select
              value={certificationFilter}
              onChange={(e) => setCertificationFilter(e.target.value)}
              className="px-3 py-1.5 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100"
            >
              <option value="all">All Levels</option>
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
            </select>

            <button
              onClick={() => setShowCreateModal(true)}
              className="ml-auto px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              + New Club
            </button>
          </div>
        </div>

        {/* Club List */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClubs.length === 0 ? (
            <div className="md:col-span-2 lg:col-span-3 bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-12 text-center">
              <span className="text-4xl mb-4 block">🏛️</span>
              <p className="text-blue-200">{searchQuery ? 'No clubs match your search' : 'No clubs found'}</p>
            </div>
          ) : (
            filteredClubs.map((club) => (
              <div key={club.id} className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-6 hover:bg-white/15 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg text-white">{club.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getCertificationBadge(club.certification_level)}`}>
                    {club.certification_level.toUpperCase()}
                  </span>
                </div>

                <p className="text-sm text-blue-300 mb-4">{club.email}</p>

                <div className="space-y-2 text-sm text-blue-200 mb-4">
                  {club.phone && <p>📞 {club.phone}</p>}
                  {club.city && <p>📍 {club.city}, {club.postal_code}</p>}
                  {club.federation_code && <p>🏳️ Federation: {club.federation_code}</p>}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => fetchClubMembers(club.id)} className="flex-1 px-3 py-1.5 bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 rounded-lg text-sm hover:bg-cyan-500/30 transition-colors">
                    Members
                  </button>
                  <button onClick={() => openEdit(club)} className="px-3 py-1.5 bg-blue-500/20 border border-blue-400/30 text-blue-300 rounded-lg text-sm hover:bg-blue-500/30 transition-colors">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(club.id)} className="px-3 py-1.5 bg-red-500/20 border border-red-400/30 text-red-300 rounded-lg text-sm hover:bg-red-500/30 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Club Members Panel */}
        {selectedClubId && (
          <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Club Members</h3>
            {loadingMembers ? (
              <p className="text-blue-200">Loading...</p>
            ) : clubMembers.length === 0 ? (
              <p className="text-blue-200">No members found for this club.</p>
            ) : (
              <div className="space-y-3">
                {clubMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                    <span className="text-blue-100">{member.user_id}</span>
                    <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded text-sm">{member.role}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 w-full max-w-lg p-6 overflow-y-auto" style={{ maxHeight: '90vh' }}>
            <h2 className="text-xl font-bold text-white mb-4">Create New Club</h2>

            <div className="space-y-3">
              <input type="text" placeholder="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
              <input type="text" placeholder="Federation Code (optional)" value={formData.federation_code} onChange={(e) => setFormData({ ...formData, federation_code: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
              <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
              <input type="text" placeholder="Phone (optional)" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
              <input type="text" placeholder="Address (optional)" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
              <input type="text" placeholder="City (optional)" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
              <input type="text" placeholder="Postal Code (optional)" value={formData.postal_code} onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
              <select value={formData.certification_level} onChange={(e) => setFormData({ ...formData, certification_level: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400">
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">Cancel</button>
              <button onClick={handleCreate} className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingClub && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 w-full max-w-lg p-6 overflow-y-auto" style={{ maxHeight: '90vh' }}>
            <h2 className="text-xl font-bold text-white mb-4">Edit Club</h2>

            <div className="space-y-3">
              <input type="text" placeholder="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
              <input type="text" placeholder="Federation Code (optional)" value={formData.federation_code} onChange={(e) => setFormData({ ...formData, federation_code: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
              <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
              <input type="text" placeholder="Phone (optional)" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
              <input type="text" placeholder="Address (optional)" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
              <input type="text" placeholder="City (optional)" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
              <input type="text" placeholder="Postal Code (optional)" value={formData.postal_code} onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400" />
              <select value={formData.certification_level} onChange={(e) => setFormData({ ...formData, certification_level: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400">
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingClub(null)} className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">Cancel</button>
              <button onClick={handleUpdate} className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClubsPage