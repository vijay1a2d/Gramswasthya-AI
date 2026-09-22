// ── Emergency Response Page ──────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { AlertTriangle, Phone, MapPin, Clock, Ambulance, Shield, Radio, CheckCircle, XCircle } from 'lucide-react'
import { apiTriggerSOS, apiResolveSOS, apiGetNearestFacility, apiGetEmergencyEvents } from '../utils/api'

export default function Emergency() {
    const [sosResult, setSosResult] = useState(null)
    const [facilities, setFacilities] = useState(null)
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(false)
    const [sosActive, setSosActive] = useState(false)
    const [lat, setLat] = useState(15.83)
    const [lng, setLng] = useState(78.04)

    useEffect(() => {
        apiGetEmergencyEvents().then(d => setEvents(d.events || [])).catch(() => { })
        // Try to get user's actual location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude) },
                () => { } // Use defaults if denied
            )
        }
    }, [])

    const handleSOS = async () => {
        setSosActive(true)
        setLoading(true)
        try {
            const data = await apiTriggerSOS({ latitude: lat, longitude: lng, event_type: 'sos' })
            setSosResult(data)
            apiGetEmergencyEvents().then(d => setEvents(d.events || [])).catch(() => { })
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    const handleResolveSOS = async () => {
        if (!sosResult?.event_id) return
        setLoading(true)
        try {
            await apiResolveSOS(sosResult.event_id)
            setSosActive(false)
            setSosResult(null)
            apiGetEmergencyEvents().then(d => setEvents(d.events || [])).catch(() => { })
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    const handleFindFacilities = async () => {
        setLoading(true)
        try {
            const data = await apiGetNearestFacility(lat, lng)
            setFacilities(data)
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-gray-900">Emergency Response System</h1>
                <p className="text-sm text-gray-500 mt-0.5">SOS dispatch · Nearest facility finder · Emergency coordination</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* SOS Panel */}
                <div className="card flex flex-col items-center text-center space-y-4 lg:col-span-1">
                    <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertTriangle size={28} className="text-red-500" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Emergency SOS</h2>
                    <p className="text-sm text-gray-500">Trigger an emergency alert to dispatch ambulance and notify the nearest hospital</p>

                    <div className="grid grid-cols-2 gap-3 w-full">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Latitude</label>
                            <input type="number" step="0.01" value={lat} onChange={e => setLat(Number(e.target.value))} className="input-field text-center" disabled={sosActive} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Longitude</label>
                            <input type="number" step="0.01" value={lng} onChange={e => setLng(Number(e.target.value))} className="input-field text-center" disabled={sosActive} />
                        </div>
                    </div>

                    {!sosActive ? (
                        <button onClick={handleSOS} disabled={loading}
                            className="w-full py-4 rounded-xl text-white font-bold text-lg transition-all bg-red-500 hover:bg-red-600 active:scale-95 shadow-lg shadow-red-200">
                            {loading ? '🚨 Dispatching...' : '🚨 TRIGGER SOS'}
                        </button>
                    ) : (
                        <div className="w-full space-y-3">
                            <div className="w-full py-3 rounded-xl bg-red-100/50 text-red-600 font-bold border border-red-200 flex items-center justify-center gap-2 animate-pulse">
                                <Radio size={20} /> SOS ACTIVE
                            </div>
                            <button onClick={handleResolveSOS} disabled={loading}
                                className="w-full py-3 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 font-semibold transition-all border border-gray-200 flex items-center justify-center gap-2">
                                <CheckCircle size={18} /> Resolve Emergency
                            </button>
                        </div>
                    )}

                    {/* Emergency contacts */}
                    <div className="w-full space-y-2 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 font-medium">Emergency Contacts</p>
                        {[
                            { label: 'Ambulance', number: '108', icon: '🚑' },
                            { label: 'National Emergency', number: '112', icon: '📞' },
                            { label: 'Poison Control', number: '1800-11-6117', icon: '☠️' },
                        ].map(c => (
                            <div key={c.number} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                <span className="text-sm text-gray-700">{c.icon} {c.label}</span>
                                <span className="text-sm font-bold text-primary">{c.number}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SOS Result / Facility Finder */}
                <div className="lg:col-span-2 space-y-4">
                    {/* SOS Response */}
                    {sosResult && (
                        <div className="card border-2 border-red-200 bg-red-50/50 space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                    <Radio size={20} className="text-red-500 animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-red-700">Emergency Response Activated</p>
                                    <p className="text-sm text-red-600 mt-0.5">{sosResult.message}</p>
                                </div>
                            </div>

                            {sosResult.nearest_facility && (
                                <div className="p-4 rounded-xl bg-white border border-red-100">
                                    <p className="text-xs text-gray-500 font-medium mb-2">Nearest Facility Dispatched</p>
                                    <p className="text-sm font-bold text-gray-900">{sosResult.nearest_facility.name}</p>
                                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><MapPin size={12} /> {sosResult.nearest_facility.distance_km} km</span>
                                        <span className="flex items-center gap-1"><Clock size={12} /> ETA: {sosResult.estimated_response_time}</span>
                                        <span className="flex items-center gap-1"><Phone size={12} /> {sosResult.nearest_facility.phone}</span>
                                    </div>
                                </div>
                            )}

                            {sosResult.patient_summary && (
                                <div className="p-3 rounded-lg bg-white border border-gray-100">
                                    <p className="text-xs text-gray-500 font-medium mb-1">Patient Summary (Shared with Hospital)</p>
                                    <p className="text-sm text-gray-800">{sosResult.patient_summary.name} · {sosResult.patient_summary.age}y · {sosResult.patient_summary.gender}</p>
                                    {sosResult.patient_summary.allergies?.length > 0 && (
                                        <p className="text-xs text-red-600 mt-1">⚠️ Allergies: {sosResult.patient_summary.allergies.join(', ')}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Facility Finder */}
                    <div className="card space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><MapPin size={16} /> Nearest Facilities</h2>
                            <button onClick={handleFindFacilities} disabled={loading} className="btn-secondary text-xs">
                                {loading ? 'Finding...' : '📍 Find Near Me'}
                            </button>
                        </div>

                        {facilities && (
                            <div className="space-y-2">
                                {facilities.facilities?.map((f, i) => (
                                    <div key={i} className="p-3 rounded-lg bg-gray-50 border border-gray-100 flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">{f.name}</p>
                                            <p className="text-xs text-gray-500">{f.type} · {f.district}, {f.state}</p>
                                            <div className="flex gap-3 mt-1 text-xs text-gray-400">
                                                <span>{f.beds} beds</span>
                                                <span>{f.phone}</span>
                                                {f.emergency && <span className="text-green-600">✅ Emergency</span>}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-primary">{f.distance_km}</p>
                                            <p className="text-xs text-gray-400">km</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!facilities && !sosResult && (
                            <p className="text-sm text-gray-400 text-center py-6">Click "Find Near Me" to locate nearby healthcare facilities</p>
                        )}
                    </div>

                    {/* Recent Events */}
                    {events.length > 0 && (
                        <div className="card space-y-3">
                            <h2 className="text-sm font-semibold text-gray-700">Recent Emergency Events</h2>
                            {events.slice(0, 5).map(e => (
                                <div key={e.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-2.5 h-2.5 rounded-full ${e.status === 'active' ? 'bg-red-500 animate-pulse' : e.status === 'dispatched' ? 'bg-amber-500' : 'bg-green-500'}`} />
                                        <div>
                                            <p className="text-sm text-gray-700 capitalize">{e.event_type} — {e.nearest_facility}</p>
                                            <p className="text-xs text-gray-400">{new Date(e.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <span className={`badge-${e.status === 'resolved' ? 'medium' : 'critical'}`}>{e.status}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
