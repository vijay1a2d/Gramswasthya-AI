import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { Users, Stethoscope, AlertTriangle, Activity, TrendingUp, Globe, CheckCircle, RefreshCw, BedDouble, Heart } from 'lucide-react'

function StatCard({ icon: Icon, label, value, sub, color = 'primary', pulse }) {
  const colors = {
    primary: 'bg-primary-light text-primary',
    red:     'bg-red-100 text-red-600',
    amber:   'bg-amber-100 text-amber-600',
    blue:    'bg-blue-100 text-blue-600',
  }
  return (
    <div className="card flex items-start gap-4 relative overflow-hidden group hover:shadow-md transition-shadow">
      {pulse && <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
        <span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative rounded-full h-2.5 w-2.5 bg-green-500"></span>
      </span>}
      <div className={`p-2.5 rounded-xl ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function DashboardHome() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchDashboard = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/dashboard/stats')
      if (!res.ok) throw new Error('API error')
      const json = await res.json()
      setData(json)
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
    const interval = setInterval(fetchDashboard, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Activity className="animate-pulse text-primary" size={48} />
        <p className="text-gray-500 font-medium">Loading real-time data...</p>
      </div>
    )
  }

  if (!data) return null

  const triageData = [
    { name: 'Routine', value: data.triage.routine, color: '#0ea472' },
    { name: 'Urgent', value: data.triage.urgent, color: '#f59e0b' },
    { name: 'Emergency', value: data.triage.emergency, color: '#ef4444' },
  ]

  const screeningData = [
    { month: 'Sep', tb: 120, retina: 45, malaria: 80 },
    { month: 'Oct', tb: 145, retina: 60, malaria: 95 },
    { month: 'Nov', tb: 189, retina: 72, malaria: 110 },
    { month: 'Dec', tb: 210, retina: 88, malaria: 130 },
    { month: 'Jan', tb: 234, retina: 89, malaria: 145 },
    { month: 'Feb', tb: 267, retina: 102, malaria: 165 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">GramSwasthya AI — Command Center</h1>
          <p className="text-sm text-gray-500 mt-0.5">Rural healthcare intelligence platform · Real-time overview</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-green-600 font-semibold bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            LIVE · Updates every 5s
          </span>
          {lastUpdate && (
            <span className="text-gray-400 flex items-center gap-1">
              <RefreshCw size={12} /> {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}        label="Patients Registered"  value={data.kpi.total_patients.toLocaleString()}  sub={`${data.kpi.total_vitals_recorded} vitals recorded`}  color="primary" pulse />
        <StatCard icon={Stethoscope}  label="AI Diagnoses"         value={data.kpi.total_diagnoses.toLocaleString()} sub={`${data.kpi.diagnoses_today} today`}  color="blue" pulse />
        <StatCard icon={AlertTriangle} label="Active Emergencies"  value={data.kpi.active_emergencies}  sub="Live monitoring"  color="red" pulse />
        <StatCard icon={Activity}     label="High Risk Patients"   value={data.kpi.high_risk_patients}  sub="Needs follow-up" color="amber" pulse />
      </div>

      {/* Live Hospital Beds Strip */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BedDouble size={24} />
            <div>
              <p className="font-bold text-lg">Live Hospital Network — AP & Telangana</p>
              <p className="text-blue-200 text-sm">Real-time bed availability</p>
            </div>
          </div>
          <div className="flex gap-6 flex-wrap">
            <div className="text-center">
              <p className="text-2xl font-bold">{data.hospital_beds.total.toLocaleString()}</p>
              <p className="text-blue-200 text-xs">Total Beds</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-300">{data.hospital_beds.available.toLocaleString()}</p>
              <p className="text-blue-200 text-xs">Available</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-300">{data.hospital_beds.icu_available}</p>
              <p className="text-blue-200 text-xs">ICU Available</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Screening trend */}
        <div className="card lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Disease Screening Trend (6 months)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={screeningData}>
              <defs>
                <linearGradient id="tb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea472" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#0ea472" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="tb"     stroke="#0ea472" fill="url(#tb)" name="TB" />
              <Area type="monotone" dataKey="malaria" stroke="#3b82f6" fill="none" name="Malaria" />
              <Area type="monotone" dataKey="retina"  stroke="#f59e0b" fill="none" name="Retinopathy" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Triage pie */}
        <div className="card flex flex-col">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Triage Distribution (Live)</h2>
          <div className="flex-1 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={triageData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                  {triageData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-3 flex-wrap justify-center mt-2">
              {triageData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  {d.name} {d.value}%
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Disease bar */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Disease Burden — AP & Telangana (Live)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.disease_burden} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="disease" type="category" tick={{ fontSize: 11 }} width={70} />
              <Tooltip />
              <Bar dataKey="cases" fill="#0ea472" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Outbreak alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Active Outbreak Alerts — AP & TG</h2>
            <Globe size={15} className="text-gray-400" />
          </div>
          <div className="space-y-3">
            {data.outbreak_alerts.map((a, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                <span className={`badge-${a.type} mt-0.5`}>{a.type}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{a.msg}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-400">{a.time}</p>
                    <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">{a.region}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Village Health Score */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-xl font-bold text-primary">{data.village_health.avg_score}</p>
          <p className="text-xs text-gray-500 mt-1">Avg Village Health Score</p>
        </div>
        <div className="card text-center">
          <p className="text-xl font-bold text-primary">{data.village_health.avg_vaccination_coverage}%</p>
          <p className="text-xs text-gray-500 mt-1">Vaccination Coverage</p>
        </div>
        <div className="card text-center">
          <p className="text-xl font-bold text-primary">{data.hospital_beds.total.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Beds Monitored</p>
        </div>
        <div className="card text-center">
          <p className="text-xl font-bold text-primary">
            <Heart size={16} className="inline mr-1" />
            {data.kpi.total_patients}
          </p>
          <p className="text-xs text-gray-500 mt-1">Lives Tracked</p>
        </div>
      </div>
    </div>
  )
}
