import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Activity, AlertTriangle, X, UserPlus } from 'lucide-react'
import { apiGetPatients, apiRegisterPatient } from '../utils/api'

export function Patients() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Registration modal state
  const [showModal, setShowModal] = useState(false)
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState('')
  const [regSuccess, setRegSuccess] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', age: '', gender: '', village: '', district: '', state: '', blood_group: '' })

  const fetchPatients = async () => {
    setLoading(true); setError('')
    try {
      const data = await apiGetPatients()
      setPatients(data.patients || [])
      setTotal(data.total || 0)
    } catch (err) {
      const status = err?.response?.status
      if (status === 401) {
        setError('Session expired. Please sign in again.')
        navigate('/login')
        return
      }
      setError('Failed to load patients. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPatients() }, [])

  const filtered = patients.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.village || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!form.name || !form.phone || !form.age || !form.gender) {
      setRegError('Name, phone, age, and gender are required'); return
    }
    setRegLoading(true); setRegError(''); setRegSuccess('')
    try {
      await apiRegisterPatient({
        name: form.name,
        phone: form.phone,
        age: parseInt(form.age),
        gender: form.gender,
        village: form.village || null,
        district: form.district || null,
        state: form.state || null,
        blood_group: form.blood_group || null,
      })
      setRegSuccess('Patient registered successfully!')
      setForm({ name: '', phone: '', age: '', gender: '', village: '', district: '', state: '', blood_group: '' })
      setTimeout(() => { fetchPatients(); setShowModal(false); setRegSuccess('') }, 1200)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed'
      setRegError(msg)
    } finally {
      setRegLoading(false)
    }
  }

  const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  // Skeleton rows for loading state
  const SkeletonRow = () => (
    <tr className="border-b border-gray-50">
      {[...Array(7)].map((_, i) => (
        <td key={i} className="py-3 pr-4"><div className="skeleton h-4 w-20 rounded" /></td>
      ))}
    </tr>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Patient Registry</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading...' : `${total} registered patient${total !== 1 ? 's' : ''}`}
            {total > 0 && ' · Risk-stratified view'}
          </p>
        </div>
        <button onClick={() => { setShowModal(true); setRegError(''); setRegSuccess('') }}
          className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> Register Patient
        </button>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or village..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-100 p-3 rounded-xl mb-4">
            <AlertTriangle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Patient', 'Age', 'Village', 'Blood Group', 'Risk Score', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-medium pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <UserPlus size={32} className="text-gray-300" />
                      <p className="text-sm">No patients found</p>
                      <p className="text-xs">Register a new patient to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center text-primary text-xs font-bold">
                          {(p.name || '?')[0]}
                        </div>
                        <div>
                          <span className="font-medium text-gray-800">{p.name}</span>
                          {p.gender && <span className="text-xs text-gray-400 ml-1.5">({p.gender})</span>}
                          {p.patient_uid && <div className="text-[11px] font-mono text-indigo-500 mt-0.5">{p.patient_uid}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{p.age ? `${p.age}y` : '—'}</td>
                    <td className="py-3 pr-4 text-gray-600">{p.village || '—'}</td>
                    <td className="py-3 pr-4 text-gray-600">{p.blood_group || '—'}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full w-16 overflow-hidden">
                          <div className={`h-full rounded-full ${(p.risk_score || 0) >= 70 ? 'bg-red-500' : (p.risk_score || 0) >= 50 ? 'bg-amber-500' : 'bg-green-500'}`}
                            style={{ width: `${p.risk_score || 0}%` }} />
                        </div>
                        <span className={`text-xs font-semibold ${(p.risk_score || 0) >= 70 ? 'text-red-600' : (p.risk_score || 0) >= 50 ? 'text-amber-600' : 'text-green-600'}`}>
                          {p.risk_score || 0}
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <button onClick={() => navigate('/health-passport', { state: { patientId: p.id } })} className="text-xs text-primary hover:underline">View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Register Patient Modal ─────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Register New Patient</h2>
            <p className="text-sm text-gray-500 mb-5">Fill in the patient details below</p>

            {regError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-100 p-3 rounded-xl mb-4">{regError}</div>
            )}
            {regSuccess && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-100 p-3 rounded-xl mb-4">{regSuccess}</div>
            )}

            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Full Name *</label>
                <input type="text" value={form.name} onChange={e => updateForm('name', e.target.value)}
                  placeholder="Patient's full name"
                  className="login-input" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Phone *</label>
                  <input type="text" value={form.phone} onChange={e => updateForm('phone', e.target.value)}
                    placeholder="Phone number"
                    className="login-input" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Age *</label>
                  <input type="number" value={form.age} onChange={e => updateForm('age', e.target.value)}
                    placeholder="Age" min="1" max="120"
                    className="login-input" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Gender *</label>
                  <select value={form.gender} onChange={e => updateForm('gender', e.target.value)}
                    className="login-input text-gray-600">
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Blood Group</label>
                  <select value={form.blood_group} onChange={e => updateForm('blood_group', e.target.value)}
                    className="login-input text-gray-600">
                    <option value="">Select</option>
                    <option value="A+">A+</option><option value="A-">A-</option>
                    <option value="B+">B+</option><option value="B-">B-</option>
                    <option value="O+">O+</option><option value="O-">O-</option>
                    <option value="AB+">AB+</option><option value="AB-">AB-</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Village</label>
                  <input type="text" value={form.village} onChange={e => updateForm('village', e.target.value)}
                    placeholder="Village name"
                    className="login-input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">District</label>
                  <input type="text" value={form.district} onChange={e => updateForm('district', e.target.value)}
                    placeholder="District"
                    className="login-input" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">State</label>
                  <input type="text" value={form.state} onChange={e => updateForm('state', e.target.value)}
                    placeholder="State"
                    className="login-input" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={regLoading}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {regLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><UserPlus size={15} /><span>Register</span></>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Patients
