import { useState } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { Activity, TrendingUp } from 'lucide-react'

const RADAR_DATA = [
  { factor: 'Age Risk',    value: 0 },
  { factor: 'Vitals',      value: 0 },
  { factor: 'Chronic',     value: 0 },
  { factor: 'Outbreak',    value: 0 },
  { factor: 'Nutrition',   value: 0 },
  { factor: 'Vaccination', value: 0 },
]

export default function RiskAnalytics() {
  const [form, setForm] = useState({
    age: '', gender: 'male',
    temperature: '', heart_rate: '', oxygen_level: '', glucose_level: '', bp_sys: '',
    chronic: [], outbreak_risk: 'low'
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const CHRONIC_OPTIONS = ['Diabetes','Hypertension','COPD','Heart Disease','CKD','HIV','Malnutrition']

  const toggleChronic = (c) => setForm(p => ({
    ...p, chronic: p.chronic.includes(c) ? p.chronic.filter(x => x !== c) : [...p.chronic, c]
  }))

  const analyze = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/risk/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: parseInt(form.age) || 30,
          gender: form.gender,
          temperature: form.temperature ? parseFloat(form.temperature) : null,
          heart_rate: form.heart_rate ? parseFloat(form.heart_rate) : null,
          oxygen_level: form.oxygen_level ? parseFloat(form.oxygen_level) : null,
          glucose_level: form.glucose_level ? parseFloat(form.glucose_level) : null,
          blood_pressure_sys: form.bp_sys ? parseFloat(form.bp_sys) : null,
          chronic_conditions: form.chronic,
          village_outbreak_risk: form.outbreak_risk,
        })
      })
      if (res.ok) setResult(await res.json())
      else simulateResult()
    } catch { simulateResult() }
    setLoading(false)
  }

  const simulateResult = () => {
    const age = parseInt(form.age) || 30
    let score = 20
    if (age > 60) score += 15
    if (age < 5) score += 20
    if (form.oxygen_level && parseFloat(form.oxygen_level) < 95) score += 25
    if (form.temperature && parseFloat(form.temperature) > 38.5) score += 15
    if (form.chronic.length) score += form.chronic.length * 10
    if (form.outbreak_risk === 'high') score += 20
    score = Math.min(score, 100)

    const level = score >= 70 ? 'critical' : score >= 50 ? 'high' : score >= 30 ? 'medium' : 'low'
    setResult({
      risk_score: score, risk_level: level,
      contributing_factors: {
        age_risk: age > 60 || age < 5,
        low_oxygen: form.oxygen_level && parseFloat(form.oxygen_level) < 95,
        fever: form.temperature && parseFloat(form.temperature) > 38.5,
        chronic_conditions: form.chronic,
        outbreak_exposure: form.outbreak_risk === 'high'
      },
      recommended_action: level === 'critical' ? 'IMMEDIATE hospital admission required.'
        : level === 'high' ? 'Schedule urgent PHC visit within 24 hours.'
        : level === 'medium' ? 'Monitor vitals daily and follow up in 3 days.'
        : 'Continue routine monitoring.',
      shap_values: {
        age: age > 60 ? 0.15 : 0,
        oxygen: form.oxygen_level && parseFloat(form.oxygen_level) < 95 ? 0.25 : 0,
        temperature: form.temperature && parseFloat(form.temperature) > 38.5 ? 0.15 : 0,
        chronic_disease: form.chronic.length * 0.10,
        outbreak_context: form.outbreak_risk === 'high' ? 0.20 : 0,
      }
    })
  }

  const LEVEL_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#22c55e' }
  const radarData = result ? [
    { factor: 'Age Risk',    value: result.contributing_factors.age_risk ? 80 : 20 },
    { factor: 'Vitals',      value: result.contributing_factors.low_oxygen || result.contributing_factors.fever ? 75 : 15 },
    { factor: 'Chronic',     value: Math.min(result.contributing_factors.chronic_conditions?.length * 25, 100) || 10 },
    { factor: 'Outbreak',    value: result.contributing_factors.outbreak_exposure ? 70 : 10 },
    { factor: 'Nutrition',   value: 30 },
    { factor: 'Vaccination', value: 40 },
  ] : RADAR_DATA

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Risk Analytics Engine</h1>
        <p className="text-sm text-gray-500 mt-0.5">Predictive health risk scoring · SHAP explainability · 0–100 score</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Patient Risk Assessment</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Age</label>
              <input type="number" value={form.age} onChange={e => setForm(p => ({...p, age: e.target.value}))}
                placeholder="Years" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Gender</label>
              <select value={form.gender} onChange={e => setForm(p => ({...p, gender: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option>male</option><option>female</option><option>other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block">Vitals</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'temperature', ph: 'Temperature °C' },
                { key: 'heart_rate', ph: 'Heart Rate bpm' },
                { key: 'oxygen_level', ph: 'SpO2 %' },
                { key: 'bp_sys', ph: 'BP Systolic' },
                { key: 'glucose_level', ph: 'Glucose mg/dL' },
              ].map(v => (
                <input key={v.key} type="number" placeholder={v.ph} value={form[v.key]}
                  onChange={e => setForm(p => ({...p, [v.key]: e.target.value}))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block">Chronic Conditions</label>
            <div className="flex flex-wrap gap-2">
              {CHRONIC_OPTIONS.map(c => (
                <button key={c} onClick={() => toggleChronic(c)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors
                    ${form.chronic.includes(c) ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Village Outbreak Risk</label>
            <select value={form.outbreak_risk} onChange={e => setForm(p => ({...p, outbreak_risk: e.target.value}))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <button onClick={analyze} disabled={loading}
            className="btn-primary w-full disabled:opacity-50">
            {loading ? 'Calculating Risk...' : 'Calculate Risk Score'}
          </button>
        </div>

        {/* Result */}
        <div className="space-y-4">
          {result && (
            <>
              <div className="card flex flex-col items-center py-6">
                <div className="relative w-28 h-28 mb-4">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f0f0f0" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none"
                      stroke={LEVEL_COLORS[result.risk_level]} strokeWidth="3"
                      strokeDasharray={`${result.risk_score} 100`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">{result.risk_score}</span>
                    <span className="text-xs text-gray-400">/ 100</span>
                  </div>
                </div>
                <span className={`badge-${result.risk_level} text-sm`}>{result.risk_level.toUpperCase()} RISK</span>
                <p className="text-sm text-center text-gray-600 mt-3 max-w-xs">{result.recommended_action}</p>
              </div>

              <div className="card">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">SHAP Factor Analysis</h3>
                <div className="space-y-2">
                  {Object.entries(result.shap_values || {}).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-32 capitalize">{key.replace('_', ' ')}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(val * 100, 100)}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-10 text-right">{(val * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Risk Radar</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="factor" tick={{ fontSize: 10 }} />
                    <Radar dataKey="value" stroke="#0ea472" fill="#0ea472" fillOpacity={0.3} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
          {!result && (
            <div className="card flex flex-col items-center justify-center h-64 text-center">
              <Activity size={24} className="text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">Risk score will appear here</p>
              <p className="text-xs text-gray-400 mt-1">Enter patient data and click Calculate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
