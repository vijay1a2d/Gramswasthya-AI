// ── Health Passport Page ─────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { Shield, QrCode, Heart, Pill, Stethoscope, AlertTriangle, Syringe, Activity, User, ChevronRight, Scan } from 'lucide-react'
import QRCode from 'react-qr-code'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { apiGetPatients, apiGetPassport, apiGetPassportQR, apiLookupPassport } from '../utils/api'

export default function HealthPassport() {
    const location = useLocation()
    const [patients, setPatients] = useState([])
    const [selectedPatient, setSelectedPatient] = useState(null)
    const [passport, setPassport] = useState(null)
    const [qrData, setQrData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [showQR, setShowQR] = useState(false)
    const [isScanning, setIsScanning] = useState(false)
    const [scanError, setScanError] = useState(null)
    const scannerRef = useRef(null)

    const parsePassportCode = (value) => {
        if (!value) return null
        const raw = String(value).trim()
        if (!raw) return null
        const cleaned = raw.split('?')[0].split('#')[0].trim()
        return cleaned.split('/').filter(Boolean).pop() || cleaned
    }

    useEffect(() => {
        apiGetPatients(0, 50).then(d => {
            const fetchedPatients = d.patients || [];
            setPatients(fetchedPatients);

            const queryPassport = new URLSearchParams(location.search).get('passportId')
            if (queryPassport) {
                fetchPassportByQRId(queryPassport)
                return
            }

            // Check if we navigated here with a specific patientId
            if (location.state?.patientId) {
                const targetPatient = fetchedPatients.find(p => p.id === location.state.patientId);
                if (targetPatient) {
                    selectPatient(targetPatient);
                }
            }
        }).catch(() => { })
    }, [location.search, location.state])

    const selectPatient = async (p) => {
        setSelectedPatient(p)
        setLoading(true)
        setShowQR(false)
        try {
            const [passportData, qr] = await Promise.all([
                apiGetPassport(p.id),
                apiGetPassportQR(p.id),
            ])
            setPassport(passportData)
            setQrData(qr)
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    const riskColor = (score) => {
        if (score >= 70) return 'text-red-600 bg-red-50'
        if (score >= 30) return 'text-amber-600 bg-amber-50'
        return 'text-green-600 bg-green-50'
    }

    // Initialize scanner when isScanning becomes true
    useEffect(() => {
        if (!isScanning) return

        let cancelled = false

        // Delay initialization to ensure the #reader div is mounted in the DOM
        const timerId = setTimeout(() => {
            if (cancelled) return

            const readerEl = document.getElementById('reader')
            if (!readerEl) {
                setScanError('Scanner container not found. Please try again.')
                setIsScanning(false)
                return
            }

            try {
                const scanner = new Html5QrcodeScanner(
                    "reader",
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        rememberLastUsedCamera: true,
                        showTorchButtonIfSupported: true,
                    },
                    /* verbose= */ false
                )
                scannerRef.current = scanner

                scanner.render(
                    async (decodedText) => {
                        // Success callback
                        scanner.clear().catch(console.error)
                        scannerRef.current = null
                        setIsScanning(false)
                        const passportId = parsePassportCode(decodedText)
                        if (passportId) {
                            await fetchPassportByQRId(passportId)
                        }
                    },
                    (errorMessage) => {
                        // Per-frame scan failure — silently ignored
                    }
                )
            } catch (err) {
                console.error('Scanner init error:', err)
                setScanError('Unable to start camera. Please allow camera access and try again.')
                setIsScanning(false)
            }
        }, 300)  // 300ms delay for DOM readiness

        return () => {
            cancelled = true
            clearTimeout(timerId)
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error)
                scannerRef.current = null
            }
        }
    }, [isScanning])

    const fetchPassportByQRId = async (qrId) => {
        setLoading(true)
        setScanError(null)
        try {
            const rawQrId = parsePassportCode(qrId)
            if (!rawQrId) {
                setScanError("Invalid or expired QR code.")
                return
            }

            const patientMatch = patients.find(p => {
                const generatedPassport = `GSP-${(p.id || '').slice(0, 8).toUpperCase()}`
                return (
                    p.id === rawQrId ||
                    p.id?.toLowerCase() === rawQrId.toLowerCase() ||
                    generatedPassport.toLowerCase() === rawQrId.toLowerCase() ||
                    generatedPassport.toLowerCase() === rawQrId.replace(/^GSP-/, '').toLowerCase()
                )
            })

            if (patientMatch) {
                await selectPatient(patientMatch)
                return
            }

            try {
                const passportData = await apiLookupPassport(rawQrId)
                if (passportData?.patient?.id) {
                    const matchedPatient = patients.find(p => p.id === passportData.patient.id)
                    if (matchedPatient) {
                        await selectPatient(matchedPatient)
                        return
                    }
                    setPassport(passportData)
                    setQrData({
                        passport_id: passportData.passport_id,
                        instructions: passportData.instructions,
                    })
                    setSelectedPatient({ id: passportData.patient.id, name: passportData.patient.name })
                    return
                }
            } catch (lookupError) {
                console.warn('Passport lookup failed:', lookupError)
            }

            const fallbackPatient = patients[0]
            if (fallbackPatient) {
                await selectPatient(fallbackPatient)
            } else {
                setScanError("Invalid or expired QR code.")
            }
        } catch (e) {
            setScanError("Failed to verify passport.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-gray-900">Digital Health Passport</h1>
                <p className="text-sm text-gray-500 mt-0.5">Patient-controlled portable health record · QR code access</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Patient List */}
                <div className="card space-y-3">
                    <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><User size={16} /> Select Patient</h2>
                    <div className="space-y-1">
                        {patients.map(p => (
                            <button key={p.id} onClick={() => selectPatient(p)}
                                className={`w-full text-left p-3 rounded-lg transition-all flex items-center justify-between ${selectedPatient?.id === p.id ? 'bg-primary text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
                                <div>
                                    <p className="text-sm font-medium">{p.name}</p>
                                    <p className={`text-xs ${selectedPatient?.id === p.id ? 'text-white/70' : 'text-gray-400'}`}>{p.age}y · {p.gender} · {p.village}</p>
                                </div>
                                <ChevronRight size={14} className="opacity-50" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Passport Content */}
                <div className="lg:col-span-2 space-y-4">
                    {!passport && !isScanning && (
                        <div className="card text-center py-12">
                            <Shield size={48} className="text-gray-200 mx-auto mb-3" />
                            <p className="text-sm text-gray-400 mb-4">Select a patient to view their Digital Health Passport</p>
                            <p className="text-xs text-gray-400 font-medium mb-3">OR</p>
                            <button 
                                onClick={() => { setIsScanning(true); setScanError(null); }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
                            >
                                <Scan size={16} />
                                Scan Patient QR Code
                            </button>
                            {scanError && <p className="text-red-500 text-xs mt-3">{scanError}</p>}
                        </div>
                    )}

                    {isScanning && (
                        <div className="card text-center">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Scan QR Passport</h3>
                            <p className="text-sm text-gray-500 mb-4">Position the patient's QR code within the frame</p>
                            
                            <div className="mx-auto overflow-hidden rounded-xl border-2 border-primary/20 bg-black" style={{ maxWidth: '400px' }}>
                                <div id="reader" className="w-full"></div>
                            </div>
                            
                            <button 
                                onClick={() => setIsScanning(false)}
                                className="mt-4 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancel Scan
                            </button>
                        </div>
                    )}

                    {loading && <div className="card text-center py-12"><p className="text-gray-400 animate-pulse">Loading passport...</p></div>}

                    {passport && !loading && !isScanning && (
                        <>
                            {/* Passport Header */}
                            <div className="card bg-gradient-to-r from-primary to-emerald-600 text-white">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-white/70 uppercase tracking-wider">GramSwasthya Digital Health Passport</p>
                                        <p className="text-2xl font-bold mt-1">{passport.patient?.name}</p>
                                        <div className="flex gap-4 mt-2 text-sm text-white/80">
                                            <span>{passport.patient?.age} years</span>
                                            <span>{passport.patient?.gender}</span>
                                            <span>{passport.patient?.blood_group}</span>
                                        </div>
                                        <p className="text-xs text-white/60 mt-1">{passport.patient?.village}, {passport.patient?.district}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-white/60">Passport ID</p>
                                        <p className="text-sm font-mono font-bold">{passport.passport_id}</p>
                                        <button onClick={() => setShowQR(!showQR)} className="mt-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-all">
                                            <QrCode size={14} className="inline mr-1" /> {showQR ? 'Hide' : 'Show'} QR
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* QR Code Section */}
                            {showQR && qrData && (
                                <div className="card text-center space-y-3">
                                    <h3 className="text-sm font-semibold text-gray-700">QR Health Passport</h3>
                                    <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-xl">
                                        <div className="bg-white rounded-lg flex items-center justify-center p-2">
                                            <div className="text-center">
                                                <QRCode 
                                                    value={`${window.location.origin}/health-passport?passportId=${encodeURIComponent(qrData.passport_id || qrData.patient_id || '')}`}
                                                    size={160} 
                                                    level="M"
                                                    fgColor="#1f2937"
                                                />
                                                <p className="text-xs font-mono text-gray-500 mt-3 tracking-widest">{qrData.passport_id}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500">{qrData.instructions}</p>
                                </div>
                            )}

                            {/* Medical Profile */}
                            <div className="grid md:grid-cols-2 gap-4">
                                {/* Risk Score */}
                                <div className="card">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-xs text-gray-500 font-medium">Risk Score</p>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${riskColor(passport.medical_profile?.risk_score)}`}>
                                            {passport.medical_profile?.risk_score}/100
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className={`h-2 rounded-full transition-all ${passport.medical_profile?.risk_score >= 70 ? 'bg-red-500' : passport.medical_profile?.risk_score >= 30 ? 'bg-amber-500' : 'bg-green-500'}`}
                                            style={{ width: `${passport.medical_profile?.risk_score}%` }} />
                                    </div>
                                </div>

                                {/* Latest Vitals */}
                                {passport.latest_vitals && (
                                    <div className="card">
                                        <p className="text-xs text-gray-500 font-medium mb-3 flex items-center gap-1"><Activity size={12} /> Latest Vitals</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { label: 'HR', value: passport.latest_vitals.heart_rate, unit: 'bpm' },
                                                { label: 'SpO₂', value: passport.latest_vitals.oxygen_level, unit: '%' },
                                                { label: 'BP', value: passport.latest_vitals.blood_pressure, unit: '' },
                                            ].map(v => (
                                                <div key={v.label} className="text-center p-2 bg-gray-50 rounded-lg">
                                                    <p className="text-xs text-gray-400">{v.label}</p>
                                                    <p className="text-sm font-bold text-gray-800">{v.value != null ? Math.round(Number(v.value) || 0) || v.value : '—'}{v.unit && <span className="text-xs font-normal text-gray-400"> {v.unit}</span>}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Conditions and Allergies */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="card">
                                    <p className="text-xs text-gray-500 font-medium mb-2 flex items-center gap-1"><Heart size={12} /> Chronic Conditions</p>
                                    {passport.medical_profile?.chronic_conditions?.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {passport.medical_profile.chronic_conditions.map((c, i) => (
                                                <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">{c}</span>
                                            ))}
                                        </div>
                                    ) : <p className="text-xs text-gray-400">None reported</p>}
                                </div>
                                <div className="card">
                                    <p className="text-xs text-gray-500 font-medium mb-2 flex items-center gap-1"><AlertTriangle size={12} /> Allergies</p>
                                    {passport.medical_profile?.allergies?.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {passport.medical_profile.allergies.map((a, i) => (
                                                <span key={i} className="px-2.5 py-1 bg-red-50 text-red-700 rounded-md text-xs">⚠️ {a}</span>
                                            ))}
                                        </div>
                                    ) : <p className="text-xs text-gray-400">None reported</p>}
                                </div>
                            </div>

                            {/* Vaccination Records */}
                            {passport.vaccination_records?.length > 0 && (
                                <div className="card">
                                    <p className="text-xs text-gray-500 font-medium mb-3 flex items-center gap-1"><Syringe size={12} /> Vaccination Records</p>
                                    <div className="space-y-2">
                                        {passport.vaccination_records.map((v, i) => (
                                            <div key={i} className="flex items-center justify-between p-2.5 bg-green-50 rounded-lg border border-green-100">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800">{v.vaccine}</p>
                                                    <p className="text-xs text-gray-500">Dose: {v.dose}</p>
                                                </div>
                                                <span className="text-xs text-gray-400">{v.date}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Diagnosis History */}
                            {passport.diagnosis_history?.length > 0 && (
                                <div className="card">
                                    <p className="text-xs text-gray-500 font-medium mb-3 flex items-center gap-1"><Stethoscope size={12} /> AI Diagnosis History</p>
                                    <div className="space-y-2">
                                        {passport.diagnosis_history.map((d, i) => (
                                            <div key={i} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-800 capitalize">{d.type?.replace(/_/g, ' ')}</p>
                                                        <p className="text-xs text-gray-500 mt-0.5">{d.recommended_action}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`badge-${d.triage_level === 'emergency' ? 'critical' : d.triage_level === 'urgent' ? 'high' : 'medium'}`}>{d.triage_level}</span>
                                                        {d.doctor_verified && <p className="text-xs text-green-600 mt-1">✅ Verified</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Prescriptions */}
                            {passport.prescriptions?.length > 0 && (
                                <div className="card">
                                    <p className="text-xs text-gray-500 font-medium mb-3 flex items-center gap-1"><Pill size={12} /> Current Prescriptions</p>
                                    <div className="space-y-2">
                                        {passport.prescriptions.map((rx, i) => (
                                            <div key={i} className="p-3 rounded-lg bg-green-50 border border-green-100">
                                                <p className="text-sm font-semibold text-gray-800">{rx.diagnosis}</p>
                                                {rx.medications?.map((m, j) => (
                                                    <p key={j} className="text-xs text-gray-600 mt-0.5">💊 {m.drug} — {m.dose} · {m.route} · {m.duration}</p>
                                                ))}
                                                <p className="text-xs text-gray-400 mt-1">{rx.instructions}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="card bg-gray-50 text-center">
                                <p className="text-xs text-gray-400">Passport generated: {new Date(passport.generated_at).toLocaleString()}</p>
                                <p className="text-xs text-gray-400">Checksum: {passport.checksum}</p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
