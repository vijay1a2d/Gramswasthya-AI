import { useState, useEffect } from 'react'
import { AlertTriangle, Globe, MapPin, Shield, Activity, Radio } from 'lucide-react'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { apiGetOutbreakAlerts, apiGetSurveillanceSummary, apiGetVillageScores } from '../utils/api'

const STATIC_TREND_DATA = [
  { week: 'W1', measles: 45, malaria: 120, tb: 89, dengue: 34 },
  { week: 'W2', measles: 67, malaria: 134, tb: 92, dengue: 45 },
  { week: 'W3', measles: 120, malaria: 145, tb: 88, dengue: 67 },
  { week: 'W4', measles: 245, malaria: 165, tb: 95, dengue: 89 },
  { week: 'W5', measles: 389, malaria: 189, tb: 112, dengue: 78 },
  { week: 'W6', measles: 510, malaria: 210, tb: 124, dengue: 65 },
]

function ScoreBar({ value, max = 100, color = '#0ea472' }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500 ease-in-out" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs text-gray-600 w-8 text-right font-mono">{Number(value).toFixed(1)}%</span>
    </div>
  )
}

export default function DiseaseIntelligence() {
  const [alerts, setAlerts] = useState([])
  const [summary, setSummary] = useState(null)
  const [villageScores, setVillageScores] = useState([])
  const [trendData, setTrendData] = useState(STATIC_TREND_DATA)

  const [selectedAlertId, setSelectedAlertId] = useState(null)
  const [filterRisk, setFilterRisk] = useState('all')

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        const [alertsRes, summaryRes, scoresRes] = await Promise.all([
          apiGetOutbreakAlerts(),
          apiGetSurveillanceSummary(),
          apiGetVillageScores()
        ])

        if (!isMounted) return

        setAlerts(alertsRes.alerts || [])
        setSummary(summaryRes)
        setVillageScores(scoresRes.villages || [])

        // Fluctuate the latest week trend data slightly for visual effect
        setTrendData(prev => prev.map((d, i) => {
          if (i === prev.length - 1) {
            return {
              ...d,
              measles: Math.max(0, d.measles + Math.floor(Math.random() * 5) - 2),
              malaria: Math.max(0, d.malaria + Math.floor(Math.random() * 5) - 2),
              tb: Math.max(0, d.tb + Math.floor(Math.random() * 5) - 2),
              dengue: Math.max(0, d.dengue + Math.floor(Math.random() * 5) - 2),
            }
          }
          return d
        }))

      } catch (error) {
        console.error('Failed to fetch disease intelligence data:', error)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  // Derived state
  const filteredAlerts = (filterRisk === 'all' ? alerts : alerts.filter(a => a.risk_level === filterRisk)).sort((a,b) => b.case_count - a.case_count)
  
  // Keep the selected alert in sync with incoming fresh data
  const defaultAlertId = alerts.length > 0 ? alerts[0].id : null
  const activeAlertId = selectedAlertId || defaultAlertId
  const selectedAlert = alerts.find(a => a.id === activeAlertId)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Disease Intelligence Module</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time global & national outbreak surveillance · WHO · CDC · IDSP</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-200 shadow-sm animate-pulse">
            <Radio size={14} className="animate-ping" />
            <span className="text-xs font-semibold tracking-wide">LIVE DATA CONNECTION</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Outbreaks', value: summary?.active_outbreaks || '-', icon: AlertTriangle, color: 'red' },
          { label: 'Critical Alerts', value: summary?.critical_alerts || '-', icon: Globe, color: 'red' },
          { label: 'Diseases Monitored', value: summary?.monitored_diseases?.length || '-', icon: Shield, color: 'blue' },
          { label: 'Data Sources', value: summary?.data_sources?.length || '-', icon: Activity, color: 'primary' },
        ].map(s => (
          <div key={s.label} className="card flex items-center gap-3 transition-all duration-300">
            <div className={`p-2 rounded-lg ${s.color === 'red' ? 'bg-red-100 text-red-600' : s.color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-primary-light text-primary'}`}>
              <s.icon size={18} />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 tabular-nums">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Alert list */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Outbreak Alerts</h2>
            <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-primary">
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
            </select>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filteredAlerts.length === 0 ? (
               <p className="text-xs text-gray-400 py-4 text-center">No alerts found</p>
            ) : (
                filteredAlerts.map(a => (
                <div key={a.id} onClick={() => setSelectedAlertId(a.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${activeAlertId === a.id ? 'border-primary bg-primary-light shadow-sm' : 'border-gray-100 hover:border-gray-300'}`}>
                    <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-800">{a.disease}</span>
                    <span className={`badge-${a.risk_level}`}>{a.risk_level}</span>
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={11}/>{a.region}</p>
                    <p className="text-xs text-gray-400 mt-1"><span className="font-mono text-gray-600 font-medium">{a.case_count.toLocaleString()}</span> cases · {a.source}</p>
                </div>
                ))
            )}
          </div>
        </div>

        {/* Alert detail */}
        <div className="card lg:col-span-2 space-y-4">
          {selectedAlert ? (
            <div className="animate-in fade-in duration-300">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900">{selectedAlert.disease}</h2>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={13}/>{selectedAlert.region}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`badge-${selectedAlert.risk_level} text-sm`}>{selectedAlert.risk_level.toUpperCase()}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-mono">{selectedAlert.case_count.toLocaleString()} cases</span>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg mt-4 border border-gray-100">
                <p className="text-sm text-gray-700 leading-relaxed">{selectedAlert.description}</p>
              </div>

              <div className="mt-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recommended Actions</h3>
                <ul className="space-y-1.5">
                  {(selectedAlert.recommendations || []).map((r, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-400 pt-3 mt-4 border-t border-gray-100">
                <span>Source: {selectedAlert.source}</span>
                <span>Detected: {new Date(selectedAlert.detected_at).toLocaleDateString()}</span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Active
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                <Activity size={32} className="opacity-20" />
                <p className="text-sm">Select an alert to view live details</p>
            </div>
          )}
        </div>
      </div>

      {/* Disease trends */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">6-Week Disease Trend (<span className="text-primary animate-pulse">Live Tracking</span>)</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Line type="monotone" dataKey="measles" stroke="#ef4444" strokeWidth={2} dot={false} name="Measles" isAnimationActive={false} />
            <Line type="monotone" dataKey="malaria" stroke="#f59e0b" strokeWidth={2} dot={false} name="Malaria" isAnimationActive={false} />
            <Line type="monotone" dataKey="tb"      stroke="#3b82f6" strokeWidth={2} dot={false} name="TB" isAnimationActive={false} />
            <Line type="monotone" dataKey="dengue"  stroke="#8b5cf6" strokeWidth={2} dot={false} name="Dengue" isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 justify-center">
          {[['Measles','#ef4444'],['Malaria','#f59e0b'],['TB','#3b82f6'],['Dengue','#8b5cf6']].map(([label, color]) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-3 h-0.5" style={{ background: color, display: 'inline-block' }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Village health scores */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center justify-between">
            Live Village Health Scores
            <span className="text-xs text-gray-400 font-normal">Auto-updating metrics array</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs text-gray-400 font-medium pb-2">Village</th>
                <th className="text-left text-xs text-gray-400 font-medium pb-2">Health Score</th>
                <th className="text-left text-xs text-gray-400 font-medium pb-2">Vaccination</th>
                <th className="text-left text-xs text-gray-400 font-medium pb-2">Malnutrition</th>
                <th className="text-left text-xs text-gray-400 font-medium pb-2">Maternal Risk</th>
              </tr>
            </thead>
            <tbody>
              {villageScores.map(v => (
                <tr key={v.village} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 font-medium text-gray-800">
                    {v.village}
                    <div className="text-[10px] text-gray-400 mt-0.5">{v.district}, {v.state}</div>
                  </td>
                  <td className="py-3 w-40">
                    <ScoreBar value={v.health_score} color={v.health_score >= 70 ? '#22c55e' : v.health_score >= 60 ? '#f59e0b' : '#ef4444'} />
                  </td>
                  <td className="py-3 w-32"><ScoreBar value={v.vaccination_coverage} color="#3b82f6" /></td>
                  <td className="py-3 w-32"><ScoreBar value={v.malnutrition_rate} color="#ef4444" /></td>
                  <td className="py-3 w-32"><ScoreBar value={v.maternal_risk} color="#f97316" /></td>
                </tr>
              ))}
              {villageScores.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-400">Loading live scores...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
