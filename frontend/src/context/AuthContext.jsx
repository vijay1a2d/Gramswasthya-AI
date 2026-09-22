import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gs_user')) } catch { return null }
  })

  const login = (userData) => {
    // userData should include: access_token, name, role, user_id
    setUser(userData)
    localStorage.setItem('gs_user', JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('gs_user')
  }

  const token = user?.access_token || null

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
