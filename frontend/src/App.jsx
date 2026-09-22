import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardHome from './pages/DashboardHome'
import AIdiagnosis from './pages/AIDiagnosis'
import Patients from './pages/Patients'
import DiseaseIntelligence from './pages/DiseaseIntelligence'
import WorkflowPage from './pages/Workflow'
import RiskAnalytics from './pages/RiskAnalytics'
import CDSS from './pages/CDSS'
import Emergency from './pages/Emergency'
import HealthPassport from './pages/HealthPassport'
import Appointments from './pages/Appointments'
import HospitalBeds from './pages/HospitalBeds'
import Telemedicine from './pages/Telemedicine'
import Login from './pages/Login'
import Profile from './pages/Profile'
import DietPlan from './pages/DietPlan'
import { AuthProvider, useAuth } from './context/AuthContext'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}

function RoleRoute({ children, roles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<DashboardHome />} />
          <Route path="diagnosis" element={<AIdiagnosis />} />
          <Route path="patients" element={<Patients />} />
          <Route path="disease-intelligence" element={<DiseaseIntelligence />} />
          <Route path="workflow" element={<WorkflowPage />} />
          <Route path="risk" element={<RiskAnalytics />} />
          <Route path="cdss" element={<CDSS />} />
          <Route path="emergency" element={<Emergency />} />
          <Route path="health-passport" element={<RoleRoute roles={['doctor', 'admin']}><HealthPassport /></RoleRoute>} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="telemedicine" element={<Telemedicine />} />
          <Route path="hospital-beds" element={<HospitalBeds />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
