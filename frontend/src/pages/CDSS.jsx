// ── Clinical Decision Support System (CDSS) Page ────────────────────────────
import { useState, useEffect } from 'react'
import { Stethoscope, AlertTriangle, Pill, BookOpen, Shield, ChevronRight, Search, X, CheckCircle, Info, Activity } from 'lucide-react'
import { apiSuggestTreatment, apiCheckDrugInteractions, apiGetCdssDiseases, apiGetGuidelines } from '../utils/api'

const COMMON_SYMPTOMS = [
    'fever', 'cough', 'headache', 'body_ache', 'nausea', 'vomiting',
    'diarrhea', 'breathlessness', 'chest_pain', 'weight_loss', 'night_sweats',
    'fatigue', 'joint_pain', 'rash', 'sore_throat', 'runny_nose',
    'abdominal_pain', 'frequent_urination', 'blurred_vision', 'swelling',
    'chills', 'sweating', 'dehydration', 'dizziness', 'wheezing',
    'hunger', 'dry_cough', 'loss_of_taste', 'memory_loss', 'fainting', 
    'constipation', 'itching', 'body_pains', 'muscle_pains'
]

export default function CDSS() {
    const [activeTab, setActiveTab] = useState('treatment')
    const [symptoms, setSymptoms] = useState([])
    const [age, setAge] = useState(30)
    const [gender, setGender] = useState('male')
    const [currentMeds, setCurrentMeds] = useState('')
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [drugInput, setDrugInput] = useState('')
    const [drugResult, setDrugResult] = useState(null)
    const [diseases, setDiseases] = useState([])
    const [guidelines, setGuidelines] = useState(null)
    const [selectedDisease, setSelectedDisease] = useState('')

    useEffect(() => {
        apiGetCdssDiseases().then(d => setDiseases(d.diseases || [])).catch(() => { })
    }, [])

    const toggleSymptom = (s) => {
        setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
    }

    const handleSuggestTreatment = async () => {
        if (symptoms.length === 0) return
        setLoading(true)
        try {
            const meds = currentMeds.split(',').map(m => m.trim()).filter(Boolean)
            const data = await apiSuggestTreatment({ symptoms, age: Number(age), gender, current_medications: meds })
            setResult(data)
        } catch (e) {
            console.error(e)
        }
        setLoading(false)
    }

    const handleDrugCheck = async () => {
        const drugs = drugInput.split(',').map(d => d.trim()).filter(Boolean)
        if (drugs.length < 2) {
            setDrugResult({ error: 'Please enter at least two medications to check for interactions.' })
            return
        }
        setLoading(true)
        setDrugResult(null)
        try {
            const data = await apiCheckDrugInteractions(drugs)
            setDrugResult(data)
        } catch (e) {
            console.error(e)
            setDrugResult({ error: 'An error occurred while checking interactions on the server.' })
        }
        setLoading(false)
    }

    const handleGetGuidelines = async (disease) => {
        setSelectedDisease(disease)
        setLoading(true)
        try {
            const data = await apiGetGuidelines(disease)
            setGuidelines(data)
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    const tabs = [
        { id: 'treatment', label: 'Treatment Advisor', icon: Stethoscope },
        { id: 'drugs', label: 'Drug Interactions', icon: Pill },
        { id: 'guidelines', label: 'Guidelines', icon: BookOpen },
    ]

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-gray-900">Clinical Decision Support</h1>
                <p className="text-sm text-gray-500 mt-0.5">AI-powered treatment recommendations · WHO/ICMR guidelines</p>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        <t.icon size={16} /> {t.label}
                    </button>
                ))}
            </div>

            {/* Treatment Advisor Tab */}
            {activeTab === 'treatment' && (
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Input */}
                    <div className="card space-y-5">
                        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Stethoscope size={16} /> Patient Symptoms</h2>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Age</label>
                                <input type="number" value={age} onChange={e => setAge(e.target.value)} className="input-field" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Gender</label>
                                <select value={gender} onChange={e => setGender(e.target.value)} className="input-field">
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-gray-500 mb-2 block">Select symptoms (click to toggle)</label>
                            <div className="flex flex-wrap gap-2">
                                {COMMON_SYMPTOMS.map(s => (
                                    <button key={s} onClick={() => toggleSymptom(s)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${symptoms.includes(s) ? 'bg-primary text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                        {s.replace(/_/g, ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Current medications (comma separated)</label>
                            <input type="text" value={currentMeds} onChange={e => setCurrentMeds(e.target.value)} placeholder="e.g. Metformin, Amlodipine" className="input-field" />
                        </div>

                        <button onClick={handleSuggestTreatment} disabled={symptoms.length === 0 || loading}
                            className="btn-primary w-full justify-center">
                            {loading ? 'Analyzing...' : '🔍 Get AI Treatment Suggestion'}
                        </button>
                    </div>

                    {/* Result */}
                    <div className="card space-y-4">
                        <h2 className="text-sm font-semibold text-gray-700">AI Recommendation</h2>

                        {!result && <p className="text-sm text-gray-400 py-8 text-center">Select symptoms and click analyze</p>}

                        {result && (
                            <div className="space-y-4">
                                {/* Primary diagnosis */}
                                {result.primary_diagnosis && (
                                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                                        <p className="text-xs text-primary font-semibold uppercase tracking-wide">Primary Diagnosis</p>
                                        <p className="text-lg font-bold text-gray-900 mt-1">{result.primary_diagnosis}</p>
                                        <div className="flex gap-3 mt-2">
                                            <span className={`badge-${result.triage_level === 'emergency' ? 'critical' : result.triage_level === 'urgent' ? 'high' : 'medium'}`}>{result.triage_level}</span>
                                            {result.icd11_code && <span className="text-xs text-gray-400">ICD-11: {result.icd11_code}</span>}
                                        </div>
                                    </div>
                                )}

                                {/* Other conditions */}
                                {result.conditions?.length > 1 && (
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium mb-2">Differential Diagnoses</p>
                                        {result.conditions.slice(1).map((c, i) => (
                                            <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50">
                                                <span className="text-sm text-gray-700">{c.disease}</span>
                                                <span className="text-xs text-gray-400">{(c.probability * 100).toFixed(0)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Treatment */}
                                {result.treatment && (
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium mb-2">Recommended Treatment</p>
                                        <div className="space-y-2">
                                            {result.treatment.first_line?.map((med, i) => (
                                                <div key={i} className="p-3 rounded-lg bg-green-50 border border-green-100">
                                                    <p className="text-sm font-semibold text-gray-800">💊 {med.drug}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">{med.dose} · {med.route} · {med.duration}</p>
                                                </div>
                                            ))}
                                        </div>
                                        {result.treatment.precautions && (
                                            <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                                                <p className="text-xs font-semibold text-amber-700 mb-1">⚠️ Precautions</p>
                                                <ul className="text-xs text-amber-600 space-y-0.5">
                                                    {result.treatment.precautions.map((p, i) => <li key={i}>• {p}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-400 mt-2">📖 Source: {result.treatment.source}</p>
                                    </div>
                                )}

                                {/* Investigations */}
                                {result.investigations?.length > 0 && (
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium mb-2">Recommended Investigations</p>
                                        <div className="flex flex-wrap gap-2">
                                            {result.investigations.map((inv, i) => (
                                                <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">{inv}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Drug interactions */}
                                {result.drug_interactions?.length > 0 && (
                                    <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                                        <p className="text-xs font-semibold text-red-700 mb-1">🔴 Drug Interactions Detected</p>
                                        {result.drug_interactions.map((int_, i) => (
                                            <p key={i} className="text-xs text-red-600">• {int_.drug_a} + {int_.drug_b}: {int_.effect}</p>
                                        ))}
                                    </div>
                                )}

                                {/* Contraindications */}
                                {result.contraindication_alerts?.length > 0 && (
                                    <div className="p-3 rounded-lg bg-orange-50 border border-orange-100">
                                        <p className="text-xs font-semibold text-orange-700 mb-1">⚠️ Contraindication Alerts</p>
                                        {result.contraindication_alerts.map((a, i) => (
                                            <p key={i} className="text-xs text-orange-600">• {a.drug} — {a.message}</p>
                                        ))}
                                    </div>
                                )}

                                <p className="text-xs text-gray-400 italic mt-2">{result.disclaimer}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Drug Interactions Tab */}
            {activeTab === 'drugs' && (
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Input Panel */}
                    <div className="card space-y-5 lg:col-span-1 border-t-4 border-t-primary shadow-sm h-fit">
                        <div className="border-b border-gray-100 pb-4">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Shield size={20} className="text-primary" /> Pharmacovigilance
                            </h2>
                            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                                Cross-reference multi-drug regimens against the clinical knowledge base to identify adverse interactions.
                            </p>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 block">Regimen Entry</label>
                            <div className="relative group">
                                <Pill size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" />
                                <input type="text" value={drugInput} onChange={e => setDrugInput(e.target.value)}
                                    placeholder="e.g. Metformin, Amlodipine..." 
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none" 
                                />
                            </div>
                            
                            <div className="mt-4 p-3 bg-blue-50/30 border border-blue-100/50 rounded-lg min-h-[60px]">
                                <p className="text-[10px] uppercase font-bold text-blue-400 mb-2">Active Formulation ({drugInput.split(',').filter(d => d.trim()).length})</p>
                                <div className="flex flex-wrap gap-2">
                                    {drugInput.split(',').filter(d => d.trim()).length > 0 ? (
                                        drugInput.split(',').filter(d => d.trim()).map((d, i) => (
                                            <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white text-gray-700 text-xs font-bold shadow-sm border border-gray-200">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                {d.trim()}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">No medications added to the regimen yet.</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button onClick={handleDrugCheck} disabled={loading || drugInput.split(',').filter(d => d.trim()).length < 2} 
                            className="w-full btn-primary justify-center shadow-md hover:shadow-lg transition-all h-11 disabled:opacity-50 disabled:cursor-not-allowed">
                            {loading ? (
                                <span className="flex items-center gap-2 font-bold tracking-wide"><Activity size={18} className="animate-spin" /> SCANNING DATABASE...</span>
                            ) : (
                                <span className="flex items-center gap-2 font-bold tracking-wide"><Search size={18} /> INITIATE SCAN</span>
                            )}
                        </button>
                    </div>

                    {/* Results Panel */}
                    <div className="lg:col-span-2">
                        {!drugResult && !loading && (
                            <div className="card h-full flex flex-col items-center justify-center text-center py-16 border-dashed border-2 border-gray-200 bg-gray-50/50">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                    <Activity size={28} className="text-primary opacity-80" />
                                </div>
                                <h3 className="text-base font-bold text-gray-800">No Active Scan</h3>
                                <p className="text-sm text-gray-500 mt-2 max-w-sm">
                                    Enter two or more medications in the left panel to generate a comprehensive interaction report.
                                </p>
                            </div>
                        )}

                        {drugResult && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {drugResult.error ? (
                                    <div className="card bg-orange-50/80 border-orange-200 shadow-sm">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2.5 bg-white rounded-lg text-orange-500 shadow-sm border border-orange-100">
                                                <AlertTriangle size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-orange-900">Clinical Input Requirement Not Met</h3>
                                                <p className="text-sm font-medium text-orange-700 mt-1 leading-relaxed">{drugResult.error}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="card space-y-6 shadow-sm border border-gray-100/80">
                                        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                                            <div>
                                                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Interaction Analysis Report</h2>
                                                <div className="flex items-center gap-4 mt-2">
                                                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{drugResult.drugs_checked?.length || 0} Entities</span>
                                                    <span className="text-xs text-gray-400 font-medium font-mono">Time: {new Date().toLocaleTimeString()}</span>
                                                </div>
                                            </div>
                                            {drugResult.safe ? (
                                                <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200 shadow-sm">
                                                    <CheckCircle size={18} />
                                                    <span className="text-sm font-black tracking-widest uppercase">Cleared</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-200 shadow-sm">
                                                    <AlertTriangle size={18} className="animate-pulse" />
                                                    <span className="text-sm font-black tracking-widest uppercase">Risk Detected</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className={`px-5 py-4 rounded-xl border-l-4 ${drugResult.safe ? 'bg-green-50/50 border-l-green-500 border-green-100' : 'bg-red-50/50 border-l-red-500 border-red-100'}`}>
                                            <p className={`text-sm font-bold ${drugResult.safe ? 'text-green-800' : 'text-red-900'}`}>
                                                {drugResult.safe 
                                                    ? 'No significant pharmacokinetic or pharmacodynamic interactions were detected in the provided regimen.' 
                                                    : `Attention Required: ${drugResult.interactions_found} specific interaction(s) found that require clinical attention or dosage modification.`}
                                            </p>
                                        </div>

                                        {!drugResult.safe && drugResult.interactions?.length > 0 && (
                                            <div className="space-y-4">
                                                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1 mb-1">Detailed Clinical Findings</h3>
                                                {drugResult.interactions.map((int_, i) => (
                                                    <div key={i} className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-all duration-200 shadow-sm">
                                                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${int_.severity === 'major' ? 'bg-red-500' : 'bg-amber-400'}`} />
                                                        <div className="p-5 pl-6">
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="px-3 py-1 bg-gray-100 rounded text-sm font-black tracking-wide text-gray-800 border border-gray-200">{int_.drug_a}</div>
                                                                    <X size={14} className="text-gray-300" strokeWidth={3} />
                                                                    <div className="px-3 py-1 bg-gray-100 rounded text-sm font-black tracking-wide text-gray-800 border border-gray-200">{int_.drug_b}</div>
                                                                </div>
                                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                                                                    int_.severity === 'major' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                                                }`}>
                                                                    {int_.severity} Severity
                                                                </span>
                                                            </div>
                                                            <div className="bg-gray-50/80 p-3.5 rounded-lg border border-gray-100 mb-4">
                                                                <p className="text-sm text-gray-700 leading-relaxed font-medium">
                                                                    {int_.effect}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-start gap-3 p-3.5 bg-blue-50/60 rounded-lg border border-blue-100/60 text-blue-900">
                                                                <Info size={16} className="shrink-0 mt-0.5 text-blue-500" />
                                                                <div>
                                                                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Clinical Recommendation</p>
                                                                    <p className="text-sm font-semibold leading-relaxed">{int_.recommendation}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        <div className="pt-6 border-t border-gray-100 text-center">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.15em]">
                                                Disclaimer: AI-generated screening model · Does not replace clinical judgment
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Guidelines Tab */}
            {activeTab === 'guidelines' && (
                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="card space-y-3">
                        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><BookOpen size={16} /> Disease Guidelines</h2>
                        <div className="space-y-1">
                            {diseases.map(d => (
                                <button key={d.key} onClick={() => handleGetGuidelines(d.key)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between ${selectedDisease === d.key ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                                    {d.name}
                                    <ChevronRight size={14} className="opacity-50" />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="lg:col-span-2 card">
                        {!guidelines && <p className="text-sm text-gray-400 py-8 text-center">Select a disease to view guidelines</p>}
                        {guidelines && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-900">{guidelines.disease}</h3>

                                <div>
                                    <p className="text-xs text-gray-500 font-medium mb-2">First-line Treatment</p>
                                    {guidelines.guidelines?.first_line?.map((med, i) => (
                                        <div key={i} className="p-3 rounded-lg bg-green-50 border border-green-100 mb-2">
                                            <p className="text-sm font-semibold text-gray-800">💊 {med.drug}</p>
                                            <p className="text-xs text-gray-500">{med.dose} · {med.route} · {med.duration}</p>
                                        </div>
                                    ))}
                                </div>

                                {guidelines.guidelines?.alternative?.length > 0 && (
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium mb-2">Alternative</p>
                                        {guidelines.guidelines.alternative.map((med, i) => (
                                            <div key={i} className="p-3 rounded-lg bg-blue-50 border border-blue-100 mb-2">
                                                <p className="text-sm font-semibold text-gray-800">{med.drug}</p>
                                                <p className="text-xs text-gray-500">{med.dose} · {med.route} · {med.duration}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <p className="text-xs text-gray-500">Monitoring</p>
                                        <p className="text-sm text-gray-800 mt-0.5">{guidelines.guidelines?.monitoring}</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <p className="text-xs text-gray-500">Follow-up</p>
                                        <p className="text-sm text-gray-800 mt-0.5">{guidelines.guidelines?.follow_up}</p>
                                    </div>
                                </div>

                                {guidelines.guidelines?.precautions && (
                                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                                        <p className="text-xs font-semibold text-amber-700 mb-1">⚠️ Precautions</p>
                                        <ul className="text-xs text-amber-600 space-y-0.5">
                                            {guidelines.guidelines.precautions.map((p, i) => <li key={i}>• {p}</li>)}
                                        </ul>
                                    </div>
                                )}

                                <div className="flex items-center gap-4 text-xs text-gray-400">
                                    {guidelines.guidelines?.govt_supply && <span className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> Govt supply available</span>}
                                    {guidelines.guidelines?.generic_available && <span className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> Generic available</span>}
                                </div>

                                <p className="text-xs text-gray-400">📖 Source: {guidelines.guidelines?.source}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
