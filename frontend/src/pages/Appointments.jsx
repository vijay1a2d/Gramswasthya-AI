// ── Appointments Page ────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { Calendar, Clock, User, Plus, X, CheckCircle, AlertTriangle, Phone, MapPin, Check, XCircle, Video } from 'lucide-react'
import { apiGetAppointments, apiCreateAppointment, apiGetPatients, apiGetDoctors, apiGetHospitals, apiUpdateAppointmentStatus } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Appointments() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [appointments, setAppointments] = useState([])
    const [patients, setPatients] = useState([])
    const [doctors, setDoctors] = useState([])
    const [hospitals, setHospitals] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [loading, setLoading] = useState(true)
    const [form, setForm] = useState({
        patient_id: '', doctor_id: '', scheduled_at: '', type: 'teleconsult', notes: '', triage_level: 'routine', hospital_id: ''
    })

    const isPatient = user?.role === 'patient'
    const isDoctor = user?.role === 'doctor'

    const refreshAppointments = async () => {
        try {
            const data = await apiGetAppointments()
            setAppointments(Array.isArray(data) ? data : [])
        } catch (e) { console.error(e) }
    }

    useEffect(() => {
        Promise.all([
            refreshAppointments(),
            apiGetPatients(0, 50).then(d => setPatients(d.patients || [])),
            apiGetDoctors().then(d => setDoctors(Array.isArray(d) ? d : [])),
            apiGetHospitals().then(d => setHospitals(Array.isArray(d) ? d : []))
        ]).catch(() => { }).finally(() => setLoading(false))
    }, [])

    const handleCreate = async (e) => {
        e.preventDefault()
        try {
            await apiCreateAppointment({
                ...form,
                patient_id: isPatient ? user.id : form.patient_id,
                scheduled_at: new Date(form.scheduled_at).toISOString(),
            })
            await refreshAppointments()
            setShowForm(false)
            setForm({ patient_id: '', doctor_id: '', scheduled_at: '', type: 'teleconsult', notes: '', triage_level: 'routine', hospital_id: '' })
        } catch (e) { console.error(e) }
    }

    const updateStatus = async (id, status) => {
        try {
            await apiUpdateAppointmentStatus(id, status)
            await refreshAppointments()
        } catch (e) { console.error(e) }
    }

    const triageStyles = {
        routine: 'bg-green-50 text-green-700 border-green-200',
        urgent: 'bg-amber-50 text-amber-700 border-amber-200',
        emergency: 'bg-red-50 text-red-700 border-red-200',
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Appointments</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Schedule and manage patient appointments</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="btn-primary">
                    {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> New Appointment</>}
                </button>
            </div>

            {/* Booking Form */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 min-h-screen">
                <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in my-auto max-h-[90vh] flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
                        <h2 className="font-bold text-gray-900 flex items-center gap-2"><Calendar size={20} className="text-primary" /> Book Appointment</h2>
                        <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 rounded-lg p-1">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="overflow-y-auto p-5 grow">
                    <div className="grid md:grid-cols-2 gap-4">
                        {!isPatient && (
                            <div>
                                <label className="text-xs font-semibold text-gray-700 block mb-1">Patient</label>
                                <select value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })} className="input-field" required>
                                    <option value="">Select patient...</option>
                                    {patients.map(p => <option key={p.id} value={p.id}>{p.name} — {p.village}</option>)}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1">Select Hospital</label>
                            <select value={form.hospital_id} onChange={e => setForm({ ...form, hospital_id: e.target.value, doctor_id: '' })} className="input-field" required>
                                <option value="">Select a hospital...</option>
                                {hospitals.map(h => <option key={h.id} value={h.id}>{h.facility_name} ({h.district || h.ward})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1">Select Doctor</label>
                            <select value={form.doctor_id} disabled={!form.hospital_id} onChange={e => setForm({ ...form, doctor_id: e.target.value })} className="input-field disabled:opacity-50" required>
                                <option value="">{!form.hospital_id ? 'Select hospital first...' : 'Select doctor...'}</option>
                                {doctors.filter(d => form.hospital_id && d.hospital_ids && d.hospital_ids.includes(form.hospital_id)).map(d => (
                                    <option key={d.id} value={d.id}>Dr. {d.name} ({d.district})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Date & Time</label>
                            <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} className="input-field" required />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1">Type</label>
                            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field">
                                <option value="teleconsult">Teleconsult / Video Call</option>
                                <option value="in_person">In Person / Walk-in</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1">Priority</label>
                            <select value={form.triage_level} onChange={e => setForm({ ...form, triage_level: e.target.value })} className="input-field">
                                <option value="routine">Routine Checkup</option>
                                <option value="urgent">Urgent</option>
                                <option value="emergency">Emergency</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1">Date & Time</label>
                            <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} className="input-field focus:ring-primary/20" required />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs font-semibold text-gray-700 block mb-1">Notes</label>
                            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input-field" rows={2} placeholder="Reason for visit, symptoms, etc." />
                        </div>
                    </div>
                    </div>
                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                        <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl font-medium transition-colors">
                            Cancel
                        </button>
                        <button type="submit" className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-md shadow-primary/20">
                            Book Appointment
                        </button>
                    </div>
                </form>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="card text-center">
                    <p className="text-2xl font-bold text-primary">{appointments.length}</p>
                    <p className="text-xs text-gray-500">Total Appointments</p>
                </div>
                <div className="card text-center">
                    <p className="text-2xl font-bold text-amber-500">{appointments.filter(a => a.status === 'scheduled').length}</p>
                    <p className="text-xs text-gray-500">Upcoming / Approved</p>
                </div>
                <div className="card text-center">
                    <p className="text-2xl font-bold text-blue-500">{appointments.filter(a => a.status === 'pending').length}</p>
                    <p className="text-xs text-gray-500">Pending Requests</p>
                </div>
            </div>

            {/* Appointments List */}
            <div className="card">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">All Appointments</h2>

                {loading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
                        ))}
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="text-center py-8">
                        <Calendar size={40} className="text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No appointments yet. Click "New Appointment" to book one.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {appointments.filter(a => {
                            if (isPatient) return a.patient_id === user?.id
                            if (isDoctor) return a.doctor_id === user?.id
                            return true
                        }).map(a => {
                            const patient = patients.find(p => p.id === a.patient_id)
                            const doctor = doctors.find(d => d.id === a.doctor_id)
                            
                            return (
                                <div key={a.id} className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-md ${triageStyles[a.triage] || triageStyles.routine}`}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${a.status === 'completed' ? 'bg-green-100/50 text-green-700' : a.status === 'cancelled' ? 'bg-gray-100/50 text-gray-500' : a.status === 'pending' ? 'bg-yellow-100/50 text-yellow-700' : 'bg-blue-100/50 text-blue-700'}`}>
                                                {a.status.replace('_', ' ')}
                                            </span>
                                            <span className="text-[10px] uppercase font-bold opacity-60 px-2 border-l border-current">
                                                {a.triage} PRIORITY
                                            </span>
                                        </div>
                                        
                                        <p className="text-base font-bold text-gray-900 mt-1">
                                            {isPatient ? `Dr. ${doctor?.name || 'Unknown'}` : patient?.name || 'Unknown Patient'}
                                        </p>
                                        
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-600 font-medium">
                                            <span className="flex items-center gap-1.5"><Calendar size={14} className="opacity-50" /> {new Date(a.scheduled_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                            <span className="flex items-center gap-1.5"><Clock size={14} className="opacity-50" /> {new Date(a.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            <span className="flex items-center gap-1.5">{a.type === 'teleconsult' ? <Video size={14} className="opacity-50 text-blue-600" /> : <MapPin size={14} className="opacity-50 text-emerald-600" />} 
                                                <span className={a.type === 'teleconsult' ? 'text-blue-700' : 'text-emerald-700'}>{a.type === 'teleconsult' ? 'Virtual Call' : 'Hospital Visit'}</span>
                                            </span>
                                        </div>
                                        {a.notes && <p className="text-xs text-gray-500 mt-2 bg-white/50 p-2 rounded italic">"{a.notes}"</p>}
                                    </div>

                                    <div className="flex gap-2 shrink-0 md:flex-col lg:flex-row">
                                        {a.status === 'pending' && isDoctor && (
                                            <>
                                                <button onClick={() => updateStatus(a.id, 'scheduled')} className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-sm shadow-emerald-500/20 hover:bg-emerald-600 transition-colors flex items-center gap-1.5">
                                                    <Check size={16} /> Accept
                                                </button>
                                                <button onClick={() => updateStatus(a.id, 'cancelled')} className="px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                                                    <XCircle size={16} /> Reject
                                                </button>
                                            </>
                                        )}
                                        {a.status === 'pending' && isPatient && (
                                            <div className="px-4 py-2 border border-amber-200 bg-amber-50 text-amber-700 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2">
                                                <Clock size={16} className="animate-pulse" /> Awaiting Doctor
                                            </div>
                                        )}
                                        {a.status === 'scheduled' && a.type === 'teleconsult' && (
                                            <button onClick={() => navigate('/telemedicine')} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-colors flex items-center gap-2">
                                                <Video size={16} /> Join Call
                                            </button>
                                        )}
                                        {a.status === 'scheduled' && a.type === 'in_person' && (
                                            <div className="px-5 py-2.5 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2">
                                                <CheckCircle size={16} /> Confirmed
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
