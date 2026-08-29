import { useState, useEffect } from 'react'
import axios from 'axios'
import backgroundImg from '../images/background.png'
import LanguageSwitcher from '../components/LanguageSwitcher'

interface Notice {
  id: number
  title: string
  content: string
  type: 'general' | 'race_instruction' | 'safety' | 'urgent'
  priority: 'low' | 'medium' | 'high' | 'critical'
  published_at: string
  expires_at?: string
  author: string
  read_by_current_user: boolean
  read_count: number
  total_recipients: number
  attachments?: { name: string; url: string }[]
}

export function OfficialNoticeBoardPage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [filteredNotices, setFilteredNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null)
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied'>('default')

  useEffect(() => {
    fetchNotices()
    checkNotificationPermission()
  }, [])

  useEffect(() => {
    let filtered = notices

    if (filterType !== 'all') {
      filtered = filtered.filter(n => n.type === filterType)
    }

    if (showUnreadOnly) {
      filtered = filtered.filter(n => !n.read_by_current_user)
    }

    // Sort by priority and recency
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    filtered.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    })

    setFilteredNotices(filtered)
  }, [notices, filterType, showUnreadOnly])

  const fetchNotices = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/notices`)
      setNotices(response.data)
    } catch (error: any) {
      console.error('Failed to fetch notices:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    }
  }

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission()
        setNotificationPermission(permission)
        
        if (permission === 'granted') {
          // Register for push notifications via backend
          await registerPushSubscription()
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error)
      }
    }
  }

  const registerPushSubscription = async () => {
    try {
      // Service worker registration would go here
      // This is a placeholder for actual push subscription logic
      console.log('Registered for push notifications')
    } catch (error) {
      console.error('Error registering push subscription:', error)
    }
  }

  const markAsRead = async (noticeId: number) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/notices/${noticeId}/mark-read`)
      
      // Update local state
      setNotices(prev => prev.map(n => 
        n.id === noticeId 
          ? { ...n, read_by_current_user: true, read_count: n.read_count + 1 }
          : n
      ))

      if (selectedNotice?.id === noticeId) {
        setSelectedNotice({ ...selectedNotice, read_by_current_user: true })
      }
    } catch (error) {
      console.error('Failed to mark notice as read:', error)
    }
  }

  const sendWhatsAppNotification = async (noticeId: number) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/notices/${noticeId}/notify-whatsapp`)
      alert('WhatsApp notification sent!')
    } catch (error) {
      console.error('Failed to send WhatsApp notification:', error)
    }
  }

  const sendSMSNotification = async (noticeId: number) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/notices/${noticeId}/notify-sms`)
      alert('SMS notification sent!')
    } catch (error) {
      console.error('Failed to send SMS notification:', error)
    }
  }

  const getPriorityBadge = (priority: string) => {
    const badges = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-green-100 text-green-800 border-green-300'
    }
    return badges[priority as keyof typeof badges] || badges.low
  }

  const getTypeIcon = (type: string) => {
    const icons = {
      general: '📢',
      race_instruction: '⛵',
      safety: '⚠️',
      urgent: '🚨'
    }
    return icons[type as keyof typeof icons] || '📢'
  }

  const unreadCount = notices.filter(n => !n.read_by_current_user).length

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
                📋 Official Notice Board (ONB)
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-sm px-3 py-1 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </h1>
              <p className="text-blue-200 mt-2">
                Race instructions, safety alerts, and official communications
              </p>
            </div>

            {/* Notification Settings and Language Switcher */}
            <div className="flex items-center gap-4">
              <button
                onClick={requestNotificationPermission}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  notificationPermission === 'granted'
                    ? 'bg-green-500/20 border border-green-400/30 text-green-300'
                    : 'bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/30'
                }`}
              >
                {notificationPermission === 'granted'
                  ? '✓ Notifications Enabled'
                  : '🔔 Enable Push Notifications'}
              </button>
              {/* Language Switcher */}
              <LanguageSwitcher />
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm text-blue-200">Type:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 border border-white/20 bg-white/10 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 text-blue-100"
              >
                <option value="all">All Types</option>
                <option value="general">General</option>
                <option value="race_instruction">Race Instructions</option>
                <option value="safety">Safety Alerts</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="w-4 h-4 text-cyan-400 rounded focus:ring-cyan-400"
              />
              <span className="text-sm text-blue-200">Unread only</span>
            </label>

            <button
              onClick={fetchNotices}
              className="ml-auto px-3 py-1.5 text-sm text-cyan-300 hover:bg-white/10 rounded-lg transition-colors"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Notice List */}
          <div className="lg:col-span-2 space-y-4">
            {filteredNotices.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-12 text-center">
                <span className="text-4xl mb-4 block">📭</span>
                <p className="text-blue-200">No notices found</p>
              </div>
            ) : (
              filteredNotices.map((notice) => (
                <article
                  key={notice.id}
                  onClick={() => {
                    setSelectedNotice(notice)
                    if (!notice.read_by_current_user) {
                      markAsRead(notice.id)
                    }
                  }}
                  className={`bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border-2 cursor-pointer transition-all hover:shadow-md ${
                    !notice.read_by_current_user
                      ? 'border-cyan-400 bg-cyan-500/10'
                      : 'border-white/20'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xl">{getTypeIcon(notice.type)}</span>
                        <h3 className={`font-semibold text-lg ${!notice.read_by_current_user ? 'text-cyan-300' : 'text-white'}`}>
                          {notice.title}
                        </h3>
                      </div>
                      
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getPriorityBadge(notice.priority)}`}>
                        {notice.priority.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-blue-200 line-clamp-2 mb-4">
                      {notice.content}
                    </p>

                    <div className="flex items-center justify-between text-sm text-blue-300">
                      <div className="flex items-center gap-4">
                        <span>👤 {notice.author}</span>
                        <span>📅 {new Date(notice.published_at).toLocaleString()}</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Read Receipt */}
                        <span className="flex items-center gap-1">
                          👁️ {notice.read_count}/{notice.total_recipients}
                        </span>
                        
                        {!notice.read_by_current_user && (
                          <span className="bg-cyan-400 text-blue-900 px-2 py-0.5 rounded-full text-xs font-semibold">
                            NEW
                          </span>
                        )}
                      </div>
                    </div>

                    {notice.attachments && notice.attachments.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-sm text-blue-200 mb-2">📎 Attachments:</p>
                        <div className="flex flex-wrap gap-2">
                          {notice.attachments.map((att, idx) => (
                            <a
                              key={idx}
                              href={att.url}
                              onClick={(e) => e.stopPropagation()}
                              className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-blue-200 transition-colors"
                            >
                              📄 {att.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>

          {/* Notice Detail Panel */}
          <div className="lg:col-span-1">
            {selectedNotice ? (
              <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg border border-white/20 p-6 sticky top-8">
                <button
                  onClick={() => setSelectedNotice(null)}
                  className="lg:hidden absolute top-4 right-4 text-blue-300 hover:text-white"
                >
                  ✕
                </button>

                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{getTypeIcon(selectedNotice.type)}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityBadge(selectedNotice.priority)}`}>
                    {selectedNotice.priority.toUpperCase()}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-white mb-4">
                  {selectedNotice.title}
                </h2>

                <div className="prose prose-sm max-w-none mb-6">
                  <p className="text-blue-100 whitespace-pre-wrap">
                    {selectedNotice.content}
                  </p>
                </div>

                <div className="border-t border-white/10 pt-4 mb-6">
                  <div className="flex items-center justify-between text-sm text-blue-300 mb-2">
                    <span>Published by {selectedNotice.author}</span>
                    <span>{new Date(selectedNotice.published_at).toLocaleString()}</span>
                  </div>
                  
                  {selectedNotice.expires_at && (
                    <div className="text-sm text-orange-300 flex items-center gap-1">
                      ⏰ Expires: {new Date(selectedNotice.expires_at).toLocaleString()}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-blue-200">
                      👁️ Read by {selectedNotice.read_count}/{selectedNotice.total_recipients} recipients
                    </span>
                    <div className="w-24 bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-cyan-400 h-full transition-all"
                        style={{ width: `${(selectedNotice.read_count / selectedNotice.total_recipients) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Notification Actions (for admins) */}
                <div className="space-y-3">
                  <button
                    onClick={() => sendWhatsAppNotification(selectedNotice.id)}
                    className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    📱 Send WhatsApp Alert
                  </button>
                  
                  <button
                    onClick={() => sendSMSNotification(selectedNotice.id)}
                    className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    💬 Send SMS Alert
                  </button>
                </div>

                {/* Read Receipt Confirmation */}
                <div className="mt-4 p-3 bg-green-500/20 border border-green-400/30 rounded-lg">
                  <p className="text-sm text-green-300 flex items-center gap-2">
                    ✓ Your read receipt has been recorded
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-8 text-center sticky top-8">
                <span className="text-4xl mb-4 block">📖</span>
                <p className="text-blue-200">Select a notice to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default OfficialNoticeBoardPage