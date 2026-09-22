import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LanguageSwitcher from '../components/LanguageSwitcher'
import LoginAnimatedBackground from '../components/LoginAnimatedBackground'
import { useAuth } from '../context/AuthContext'
import { apiLogin, apiRegister } from '../utils/api'
import {
  Heart, Eye, EyeOff, User, Phone, Lock,
  Stethoscope, Shield, Activity, Leaf,
  ArrowRight, CheckCircle, AlertCircle,
  Sparkles, MapPin
} from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1
    const y = (e.clientY / window.innerHeight) * 2 - 1
    setMousePos({ x, y })
  }

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loginRole, setLoginRole] = useState('')

  const [regName, setRegName] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regRole, setRegRole] = useState('patient')
  const [regAge, setRegAge] = useState('')
  const [regGender, setRegGender] = useState('')
  const [regVillage, setRegVillage] = useState('')
  const [regDistrict, setRegDistrict] = useState('')
  const [regState, setRegState] = useState('')
  const [showRegPw, setShowRegPw] = useState(false)

  const clearMessages = () => { setError(''); setSuccess('') }

  const handleLogin = async (e) => {
    e?.preventDefault()
    if (!phone || !password) { setError('Please fill in all fields'); return }
    setLoading(true); clearMessages()
    try {
      const data = await apiLogin(phone, password)
      login(data)
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid credentials. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e?.preventDefault()
    if (!regName || !regPhone || !regPassword) {
      setError('Name, phone, and password are required'); return
    }
    setLoading(true); clearMessages()
    try {
      const data = await apiRegister({
        name: regName,
        phone: regPhone,
        password: regPassword,
        role: regRole,
        age: regAge ? parseInt(regAge) : null,
        gender: regGender || null,
        village: regVillage || null,
        district: regDistrict || null,
        state: regState || null,
      })
      login(data)
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (p, pw, role) => { setPhone(p); setPassword(pw); setLoginRole(role); setTab('login'); clearMessages() }

  return (
    <div className="login-page" onMouseMove={handleMouseMove}>
      <div 
        className="login-parallax-bg"
        style={{
          transform: `translate(${mousePos.x * -25}px, ${mousePos.y * -25}px)`
        }}
      />

      {/* Top right floating language switcher */}
      <div className="absolute top-6 right-6 z-50 text-white">
        <LanguageSwitcher />
      </div>

      {/* New Futuristic Premium Background */}
      <LoginAnimatedBackground mousePos={mousePos} />

      {/* Main centered container */}
      <div className="login-container">
        {/* ── Logo & Branding ── */}
        <div className="login-brand relative">
          <div className="relative z-10 flex flex-col items-center">
            <div className="login-logo-ring">
              <div className="login-logo-inner">
                <Heart size={28} strokeWidth={1.5} />
              </div>
            </div>
            <h1 className="login-title">GramSwasthya AI</h1>
            <p className="login-subtitle">
              AI-powered healthcare for rural India
            </p>
          </div>
        </div>

        {/* ── Feature pills row ── */}
        <div className="login-features">
          {[
            { label: 'AI Diagnosis', icon: Stethoscope },
            { label: 'Risk Analytics', icon: Activity },
            { label: 'Data Security', icon: Shield },
          ].map(({ label, icon: Ic }) => (
            <div key={label} className="login-feature-pill">
              <Ic size={14} strokeWidth={1.8} />
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* ── Auth Card ── */}
        <div className="login-card">
          {/* Tab Toggle */}
          <div className="login-tabs">
            <button
              type="button"
              onClick={() => { setTab('login'); clearMessages() }}
              className={`login-tab-btn ${tab === 'login' ? 'active' : ''}`}
            >
              <Lock size={14} />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab('register'); clearMessages() }}
              className={`login-tab-btn ${tab === 'register' ? 'active' : ''}`}
            >
              <User size={14} />
              Register
            </button>
            <div className={`login-tab-indicator ${tab === 'register' ? 'right' : ''}`} />
          </div>

          {/* Error / Success */}
          {error && (
            <div className="login-alert login-alert-error login-fade-in">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="login-alert login-alert-success login-fade-in">
              <CheckCircle size={15} className="flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* ── LOGIN FORM ── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="login-form login-fade-in">
              {/* Role Selector */}
              <div className="login-field">
                <label>I am a</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { value: 'admin', label: 'Admin', icon: Shield, color: '#6366f1' },
                    { value: 'doctor', label: 'Doctor', icon: Stethoscope, color: '#059669' },
                    { value: 'patient', label: 'Patient', icon: User, color: '#f59e0b' },
                  ].map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setLoginRole(r.value)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '12px 8px',
                        borderRadius: '12px',
                        border: loginRole === r.value
                          ? `2px solid ${r.color}`
                          : '1px solid rgba(255,255,255,0.15)',
                        background: loginRole === r.value
                          ? `${r.color}22`
                          : 'rgba(255,255,255,0.06)',
                        color: loginRole === r.value ? r.color : 'rgba(255,255,255,0.7)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontFamily: 'inherit',
                        fontSize: '0.75rem',
                        fontWeight: loginRole === r.value ? 700 : 500,
                      }}
                    >
                      <r.icon size={20} strokeWidth={1.5} />
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="login-field">
                <label>Phone / Username</label>
                <div className="login-input-wrap">
                  <Phone size={15} className="login-input-icon" />
                  <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="Enter phone or username" autoComplete="username" />
                </div>
              </div>

              <div className="login-field">
                <label>Password</label>
                <div className="login-input-wrap">
                  <Lock size={15} className="login-input-icon" />
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password" autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="login-pw-toggle">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading || !loginRole} className="login-submit-btn">
                {loading ? (
                  <div className="login-spinner" />
                ) : (
                  <>
                    <span>{loginRole ? `Sign In as ${loginRole.charAt(0).toUpperCase() + loginRole.slice(1)}` : 'Select your role above'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ── REGISTER FORM ── */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="login-form login-fade-in">
              {/* Role Selector for Registration */}
              <div className="login-field">
                <label>Register as *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { value: 'admin', label: 'Admin', icon: Shield, color: '#6366f1' },
                    { value: 'doctor', label: 'Doctor', icon: Stethoscope, color: '#059669' },
                    { value: 'patient', label: 'Patient', icon: User, color: '#f59e0b' },
                  ].map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRegRole(r.value)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 8px',
                        borderRadius: '12px',
                        border: regRole === r.value
                          ? `2px solid ${r.color}`
                          : '1px solid rgba(255,255,255,0.15)',
                        background: regRole === r.value
                          ? `${r.color}22`
                          : 'rgba(255,255,255,0.06)',
                        color: regRole === r.value ? r.color : 'rgba(255,255,255,0.7)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontFamily: 'inherit',
                        fontSize: '0.72rem',
                        fontWeight: regRole === r.value ? 700 : 500,
                      }}
                    >
                      <r.icon size={18} strokeWidth={1.5} />
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="login-field">
                <label>Full Name *</label>
                <div className="login-input-wrap">
                  <User size={15} className="login-input-icon" />
                  <input type="text" value={regName} onChange={e => setRegName(e.target.value)}
                    placeholder="Enter your full name" />
                </div>
              </div>

              <div className="login-field">
                <label>Phone Number *</label>
                <div className="login-input-wrap">
                  <Phone size={15} className="login-input-icon" />
                  <input type="text" value={regPhone} onChange={e => setRegPhone(e.target.value)}
                    placeholder="Enter phone number" />
                </div>
              </div>

              <div className="login-field">
                <label>Password *</label>
                <div className="login-input-wrap">
                  <Lock size={15} className="login-input-icon" />
                  <input type={showRegPw ? 'text' : 'password'} value={regPassword} onChange={e => setRegPassword(e.target.value)}
                    placeholder="Create a password" />
                  <button type="button" onClick={() => setShowRegPw(!showRegPw)} className="login-pw-toggle">
                    {showRegPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="login-row-2">
                <div className="login-field">
                  <label>Age</label>
                  <div className="login-input-wrap">
                    <input type="number" value={regAge} onChange={e => setRegAge(e.target.value)}
                      placeholder="Age" min="1" max="120" />
                  </div>
                </div>
                <div className="login-field">
                  <label>Gender</label>
                  <div className="login-input-wrap">
                    <select value={regGender} onChange={e => setRegGender(e.target.value)}>
                      <option value="">Select</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="login-field">
                <label>Village</label>
                <div className="login-input-wrap">
                  <MapPin size={15} className="login-input-icon" />
                  <input type="text" value={regVillage} onChange={e => setRegVillage(e.target.value)}
                    placeholder="Village name" />
                </div>
              </div>

              <div className="login-row-2">
                <div className="login-field">
                  <label>District</label>
                  <div className="login-input-wrap">
                    <input type="text" value={regDistrict} onChange={e => setRegDistrict(e.target.value)}
                      placeholder="District" />
                  </div>
                </div>
                <div className="login-field">
                  <label>State</label>
                  <div className="login-input-wrap">
                    <input type="text" value={regState} onChange={e => setRegState(e.target.value)}
                      placeholder="State" />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading} className="login-submit-btn">
                {loading ? (
                  <div className="login-spinner" />
                ) : (
                  <><span>Create Account</span><ArrowRight size={16} /></>
                )}
              </button>

              <p className="login-switch-text">
                Already have an account?{' '}
                <button type="button" onClick={() => { setTab('login'); clearMessages() }}
                  className="login-switch-link">Sign In</button>
              </p>
            </form>
          )}
        </div>

        {/* ── Demo Access (only on login tab) ── */}
        {tab === 'login' && (
          <div className="login-demo-section login-fade-in">
            <div className="login-demo-label">
              <Sparkles size={13} />
              <span>Quick Demo Access</span>
            </div>
            <div className="login-demo-btns">
              {[
                { label: 'Admin', phone: 'admin', pw: 'admin', role: 'admin', icon: Shield, color: '#6366f1' },
                { label: 'Doctor', phone: 'doctor', pw: 'doctor', role: 'doctor', icon: Stethoscope, color: '#0ea472' },
                { label: 'Patient', phone: '9100000001', pw: 'patient123', role: 'patient', icon: User, color: '#f59e0b' },
              ].map(d => (
                <button key={d.label} type="button" onClick={() => fillDemo(d.phone, d.pw, d.role)}
                  className="login-demo-btn" style={{ '--demo-color': d.color }}>
                  <d.icon size={18} strokeWidth={1.5} />
                  <span>{d.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="login-footer">
          Built with ❤️ for rural India
        </p>
      </div>
    </div>
  )
}
