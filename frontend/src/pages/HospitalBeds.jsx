import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Activity, MapPin, BedDouble, AlertCircle, RefreshCw, Server, Info, Droplet, CheckCircle2, X } from 'lucide-react'

export default function HospitalBeds() {
  const [hospitals, setHospitals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefreshed, setLastRefreshed] = useState(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { user } = useAuth()
  const [bloodReqStatus, setBloodReqStatus] = useState('') // '', 'form', 'sending', 'sent', 'acknowledged'
  const [bloodFormData, setBloodFormData] = useState({
    bloodGroup: 'O+',
    age: '',
    reason: '',
    hospital: ''
  })
  const [ackHospital, setAckHospital] = useState('')

  const handleBloodRequestClick = () => {
    setBloodReqStatus('form')
  }

  const submitBloodRequest = (e) => {
    e.preventDefault()
    setBloodReqStatus('sending')
    setTimeout(() => {
      setBloodReqStatus('sent')
      
      // Simulate hospital acknowledgement after 5 seconds
      setTimeout(() => {
        setAckHospital(bloodFormData.hospital || 'District Hospital Kurnool')
        setBloodReqStatus('acknowledged')
        
        // Clear everything after another 6 seconds
        setTimeout(() => {
          setBloodReqStatus('')
          setBloodFormData({ bloodGroup: 'O+', age: '', reason: '', hospital: '' })
        }, 6000)
      }, 5000)
      
    }, 1500)
  }

  const fetchHospitals = async (isManual = false) => {
    if (isManual) setIsRefreshing(true)
    try {
      // In a real app, this would be an absolute URL or use a configured axios instance
      const response = await fetch('http://localhost:8000/api/hospitals')
      if (!response.ok) throw new Error('Failed to fetch hospital data')
      const data = await response.json()
      setHospitals(data)
      setLastRefreshed(new Date())
    } catch (err) {
      console.error(err)
      setError('Could not connect to live hospital feed. Please ensure the backend is running.')
    } finally {
      setLoading(false)
      if (isManual) setTimeout(() => setIsRefreshing(false), 500)
    }
  }

  // Initial fetch and set interval for "real-time" simulation
  useEffect(() => {
    fetchHospitals()
    // Poll every 5 seconds to simulate real-time live data changes
    const interval = setInterval(() => {
      fetchHospitals()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const getTotalStats = () => {
    if (!hospitals.length) return { total: 0, available: 0, icuTotal: 0, icuAvailable: 0 }
    return hospitals.reduce((acc, h) => ({
      total: acc.total + h.total_beds,
      available: acc.available + h.available_beds,
      icuTotal: acc.icuTotal + h.icu_beds,
      icuAvailable: acc.icuAvailable + h.available_icu
    }), { total: 0, available: 0, icuTotal: 0, icuAvailable: 0 })
  }

  const stats = getTotalStats()

  if (loading && hospitals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Activity className="animate-pulse text-primary" size={48} />
        <p className="text-gray-500 font-medium">Connecting to State Health Networks...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Server className="text-primary" size={24} />
            Live Hospital Network
          </h1>
          <p className="text-gray-500 mt-1">Real-time bed availability for Andhra Pradesh & Telangana</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-400 font-medium">SERVER STATUS</p>
            <div className="flex items-center justify-end gap-1.5 text-sm font-semibold text-green-600">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              Connected (Live)
            </div>
          </div>

          {user?.role === 'admin' && (
            <button
              onClick={handleBloodRequestClick}
              disabled={['sending', 'sent', 'acknowledged'].includes(bloodReqStatus)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                ['sent', 'acknowledged'].includes(bloodReqStatus)
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-red-600 hover:bg-red-700 text-white border border-red-700'
              }`}
            >
              {bloodReqStatus === 'sending' ? (
                <><RefreshCw size={18} className="animate-spin" /> Requesting...</>
              ) : ['sent', 'acknowledged'].includes(bloodReqStatus) ? (
                <><CheckCircle2 size={18} /> Request Active</>
              ) : (
                <><Droplet size={18} /> Request Blood</>
              )}
            </button>
          )}

          <button 
            onClick={() => fetchHospitals(true)}
            className={`p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-all border border-gray-200 shadow-sm ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isRefreshing}
          >
            <RefreshCw size={20} className={isRefreshing ? 'animate-spin text-primary' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-start gap-3">
          <AlertCircle className="mt-0.5 shrink-0" size={18} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {bloodReqStatus === 'form' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 min-h-screen">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-red-50 shrink-0">
              <div className="flex items-center gap-2 text-red-700">
                <Droplet size={20} />
                <h3 className="font-bold">Emergency Blood Request</h3>
              </div>
              <button onClick={() => setBloodReqStatus('')} className="text-gray-400 hover:text-gray-600 bg-white rounded-lg p-1">
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-5 grow">
              <form id="blood-request-form" onSubmit={submitBloodRequest} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Blood Group *</label>
                    <select 
                      required
                      value={bloodFormData.bloodGroup}
                      onChange={e => setBloodFormData({...bloodFormData, bloodGroup: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Patient Age *</label>
                    <input 
                      type="number" required min="1" max="120" placeholder="Years"
                      value={bloodFormData.age}
                      onChange={e => setBloodFormData({...bloodFormData, age: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Target Hospital / Location *</label>
                  <input 
                    type="text" required placeholder="Where is the blood needed?"
                    value={bloodFormData.hospital}
                    onChange={e => setBloodFormData({...bloodFormData, hospital: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">This request will be broadcasted to all hospitals in AP & Telangana networks.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Emergency Reason *</label>
                  <textarea 
                    required placeholder="Brief patient condition (e.g. Accident, Surgery)" rows={2}
                    value={bloodFormData.reason}
                    onChange={e => setBloodFormData({...bloodFormData, reason: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none"
                  />
                </div>
              </form>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
              <button 
                type="submit" form="blood-request-form"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm shadow-red-600/20"
              >
                Broadcast Request
              </button>
            </div>
          </div>
        </div>
      )}

      {bloodReqStatus === 'sent' && (
        <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 flex items-start gap-4 shadow-sm animate-fade-in relative overflow-hidden">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <RefreshCw className="text-amber-600 animate-spin" size={20} />
          </div>
          <div>
            <p className="text-sm font-bold">Waiting for Hospital Acknowledgement...</p>
            <p className="text-xs text-amber-700 mt-1">
              Broadcasted request for <strong>{bloodFormData.bloodGroup}</strong> blood to all regional hospitals. Waiting for a facility to accept.
            </p>
          </div>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Droplet size={64} />
          </div>
        </div>
      )}

      {bloodReqStatus === 'acknowledged' && (
        <div className="bg-green-50 text-green-800 p-4 rounded-xl border border-green-200 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm animate-fade-in relative overflow-hidden">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0 z-10">
            <CheckCircle2 className="text-green-600" size={20} />
          </div>
          <div className="z-10 flex-1">
            <p className="text-sm font-bold">Blood Request Accepted!</p>
            <p className="text-xs text-green-700 mt-1">
              <strong>{ackHospital}</strong> has acknowledged the request and has <strong>{bloodFormData.bloodGroup}</strong> blood available for the patient. Please contact their blood bank immediately.
            </p>
          </div>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Droplet size={64} />
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20"><Activity size={64} /></div>
          <p className="text-blue-100 text-sm font-medium mb-1">Total Monitored Beds</p>
          <div className="text-3xl font-bold">{stats.total.toLocaleString()}</div>
          <div className="mt-4 text-xs font-medium bg-white/20 inline-block px-2.5 py-1 rounded-full backdrop-blur-sm">
            Across {hospitals.length} Facilities
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden group hover:border-green-200 transition-colors">
          <div className="absolute top-0 right-0 p-4 text-green-50 opacity-50 transition-transform group-hover:scale-110"><BedDouble size={64} /></div>
          <p className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Available General Beds
          </p>
          <div className="text-3xl font-bold text-gray-900">{stats.available.toLocaleString()}</div>
          <div className="mt-4 flex items-center gap-2">
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(stats.available / Math.max(stats.total, 1)) * 100}%` }}></div>
            </div>
            <span className="text-xs font-semibold text-gray-500">{Math.round((stats.available / Math.max(stats.total, 1)) * 100)}%</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden group hover:border-red-200 transition-colors">
          <div className="absolute top-0 right-0 p-4 text-red-50 opacity-50 transition-transform group-hover:scale-110"><Activity size={64} /></div>
          <p className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            Available ICU Beds
          </p>
          <div className="text-3xl font-bold text-gray-900">{stats.icuAvailable.toLocaleString()}</div>
          <div className="mt-4 flex items-center gap-2">
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${(stats.icuAvailable / Math.max(stats.icuTotal, 1)) * 100}%` }}></div>
            </div>
            <span className="text-xs font-semibold text-gray-500">{Math.round((stats.icuAvailable / Math.max(stats.icuTotal, 1)) * 100)}%</span>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 text-indigo-100 opacity-50"><MapPin size={64} /></div>
          <p className="text-indigo-800 text-sm font-medium mb-1 flex items-center gap-1.5">
            <Info size={14} /> Regional Coverage
          </p>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-indigo-900">Andhra Pradesh</span>
              <span className="text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded text-xs font-bold">Active</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-indigo-900">Telangana</span>
              <span className="text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded text-xs font-bold">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nearest Hospital Banner */}
      <div className="bg-white rounded-2xl shadow-md border border-emerald-100 p-6 flex flex-col md:flex-row items-center justify-between gap-4 mt-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
            <MapPin size={28} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Need Immediate In-Person Care?</h3>
            <p className="text-gray-500 mt-1">Locate the nearest government hospital facility directly on Google Maps.</p>
          </div>
        </div>
        <a 
          href="https://www.google.com/maps/search/nearest+government+hospital" 
          target="_blank" 
          rel="noopener noreferrer"
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 whitespace-nowrap"
        >
          <MapPin size={20} />
          Locate on Google Maps
        </a>
      </div>

      {/* Hospital List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900">Facility Matrix (Live)</h2>
          <div className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            Last Synced: {lastRefreshed.toLocaleTimeString()}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                <th className="px-6 py-4 font-semibold">Facility Name</th>
                <th className="px-6 py-4 font-semibold">General Ward</th>
                <th className="px-6 py-4 font-semibold">ICU & Critical</th>
                <th className="px-6 py-4 font-semibold text-right">Live Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {hospitals.map((hospital) => {
                const getStatusColor = (status) => {
                  if (status === 'critical') return 'text-red-600 bg-red-50 border-red-200'
                  if (status === 'warning') return 'text-orange-600 bg-orange-50 border-orange-200'
                  return 'text-green-600 bg-green-50 border-green-200'
                }
                const statusBadge = getStatusColor(hospital.status)

                return (
                  <tr key={hospital.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{hospital.facility_name}</div>
                      <div className="text-xs text-gray-500 uppercase mt-0.5">{hospital.ward} WARD</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-gray-700">{hospital.available_beds} free</span>
                            <span className="text-gray-400">of {hospital.total_beds}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${hospital.available_beds < hospital.total_beds * 0.1 ? 'bg-red-500' : 'bg-green-500'}`}
                              style={{ width: `${(hospital.available_beds / hospital.total_beds) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">{hospital.available_icu}</span>
                        <span className="text-xs text-gray-500">Available / {hospital.icu_beds} Total</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${statusBadge}`}>
                        {hospital.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
