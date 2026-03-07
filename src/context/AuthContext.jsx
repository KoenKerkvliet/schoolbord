import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/authService'
import { supabase } from '../services/supabaseClient'

const SUPER_ADMIN_EMAIL = 'koen.kerkvliet@movare.nl'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchUserRole = async (userId, email) => {
    if (email === SUPER_ADMIN_EMAIL) {
      setUserRole('super_admin')
      return 'super_admin'
    }

    try {
      const { data } = await supabase
        .from('user_organization_roles')
        .select('roles (name)')
        .eq('user_id', userId)
        .limit(1)
        .single()

      const role = data?.roles?.name || null
      setUserRole(role)
      return role
    } catch {
      setUserRole(null)
      return null
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data, error } = await authService.getSession()
        if (error) throw error
        const sessionUser = data?.session?.user || null
        setUser(sessionUser)
        if (sessionUser) {
          await fetchUserRole(sessionUser.id, sessionUser.email)
        }
      } catch (err) {
        console.error('Auth check error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    const { data } = authService.onAuthStateChange(async (event, session) => {
      const sessionUser = session?.user || null
      setUser(sessionUser)
      if (sessionUser) {
        await fetchUserRole(sessionUser.id, sessionUser.email)
      } else {
        setUserRole(null)
      }
      setLoading(false)
    })

    return () => {
      data?.subscription?.unsubscribe()
    }
  }, [])

  const login = async (email, password) => {
    try {
      setError(null)
      const { data, error } = await authService.login(email, password)
      if (error) throw error
      setUser(data.user)
      const role = await fetchUserRole(data.user.id, data.user.email)
      return { success: true, role }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const signup = async (email, password, fullName) => {
    try {
      setError(null)
      const { data, error } = await authService.signup(email, password, fullName)
      if (error) throw error
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const logout = async () => {
    try {
      setError(null)
      const { error } = await authService.logout()
      if (error) throw error
      setUser(null)
      setUserRole(null)
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const isViewer = userRole === 'viewer'

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        loading,
        error,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
        isViewer,
        isSuperAdmin: user?.email === SUPER_ADMIN_EMAIL,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
