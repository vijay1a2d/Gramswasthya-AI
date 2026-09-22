import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Stethoscope, Users, Globe, Workflow,
  TrendingUp, LogOut, Bell, Menu, X, Heart, ChevronRight,
  BookOpen, AlertTriangle, Shield, Calendar, Hospital, Video, User, Mic
} from 'lucide-react'
import { useState } from 'react'
import HealthBot from './HealthBot'
import LanguageSwitcher from './LanguageSwitcher'
import GlobalVoiceAssistant from './GlobalVoiceAssistant'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/profile', label: 'My Profile', icon: User },
  { path: '/diagnosis', label: 'AI Diagnosis', icon: Stethoscope },
  { path: '/patients', label: 'Patients', icon: Users },
  { path: '/cdss', label: 'CDSS', icon: BookOpen },
  { path: '/disease-intelligence', label: 'Disease Intel', icon: Globe },
  { path: '/workflow', label: 'Workflow', icon: Workflow },
  { path: '/risk', label: 'Risk Analytics', icon: TrendingUp },
  { path: '/health-passport', label: 'Health Passport', icon: Shield, roles: ['doctor', 'admin'] },
  { path: '/appointments', label: 'Appointments', icon: Calendar },
  { path: '/telemedicine', label: 'Teleconsult', icon: Video },
  { path: '/hospital-beds', label: 'Live Hospitals', icon: Hospital },
  { path: '/emergency', label: 'Emergency', icon: AlertTriangle },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleNav = (path) => {
    navigate(path)
    setMobileOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-gray-100 flex flex-col
        transform transition-transform duration-200
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Heart size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">GramSwasthya</p>
            <p className="text-xs text-gray-400">AI Healthcare Platform</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setMobileOpen(false)}>
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems
            .filter(item => !item.roles || item.roles.includes(user?.role))
            .map(({ path, label, icon: Icon }) => (
            <div
              key={path}
              onClick={() => handleNav(path)}
              className={`sidebar-link ${location.pathname === path ? 'active' : ''}`}
            >
              <Icon size={17} />
              <span>{label}</span>
              {location.pathname === path && <ChevronRight size={14} className="ml-auto opacity-50" />}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-primary font-semibold text-sm">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role || 'admin'}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-500 transition-colors">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-4 flex-shrink-0">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu size={20} className="text-gray-500" />
          </button>
          <div className="flex-1" />
          
          {/* Language Switcher */}
          <div className="mr-2 flex items-center justify-center relative translate-y-[2px]">
            <LanguageSwitcher />
          </div>

          <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell size={18} className="text-gray-500" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            System Online
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>

      {/* Global AI Chatbot */}
      <HealthBot />
      <GlobalVoiceAssistant />
    </div>
  )
}
