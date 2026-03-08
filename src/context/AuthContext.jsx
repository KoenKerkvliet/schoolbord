import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/authService'
import { supabase } from '../services/supabaseClient'

const SUPER_ADMIN_EMAIL = 'koen.kerkvliet@designpixels.nl'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [organizationId, setOrganizationId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const withTimeout = (promise, ms) => {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    )
    return Promise.race([promise, timeout])
  }

  const fetchUserRole = async (userId, email) => {
    if (email === SUPER_ADMIN_EMAIL) {
      setUserRole('super_admin')
      setOrganizationId(null)
      return { role: 'super_admin', organizationId: null }
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('user_organization_roles')
          .select('roles (name), organization_id')
          .eq('user_id', userId)
          .limit(1),
        5000
      )

      if (error) {
        console.error('Fout bij ophalen gebruikersrol:', error)
        setUserRole(null)
        setOrganizationId(null)
        return { role: null, organizationId: null }
      }

      const first = data?.[0]
      const role = first?.roles?.name || null
      const orgId = first?.organization_id || null
      setUserRole(role)
      setOrganizationId(orgId)
      return { role, organizationId: orgId }
    } catch (err) {
      console.error('Fout bij ophalen rol (timeout of netwerk):', err)
      setUserRole(null)
      setOrganizationId(null)
      return { role: null, organizationId: null }
    }
  }

  useEffect(() => {
    let initialCheckDone = false

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
      } finally {
        initialCheckDone = true
        setLoading(false)
      }
    }

    checkAuth()

    // Safety: force loading off after 8 seconds no matter what
    const safetyTimer = setTimeout(() => {
      setLoading(false)
    }, 8000)

    const { data } = authService.onAuthStateChange(async (event, session) => {
      // Skip INITIAL_SESSION event - checkAuth handles it
      if (!initialCheckDone && event === 'INITIAL_SESSION') return

      const sessionUser = session?.user || null
      setUser(sessionUser)
      if (sessionUser) {
        await fetchUserRole(sessionUser.id, sessionUser.email)
      } else {
        setUserRole(null)
        setOrganizationId(null)
      }
      setLoading(false)
    })

    return () => {
      clearTimeout(safetyTimer)
      data?.subscription?.unsubscribe()
    }
  }, [])

  const login = async (email, password) => {
    try {
      setError(null)
      const { data, error } = await authService.login(email, password)
      if (error) throw error
      setUser(data.user)
      const result = await fetchUserRole(data.user.id, data.user.email)
      return { success: true, role: result.role }
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
      setOrganizationId(null)
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const isViewer = userRole === 'viewer'
  const isAdmin = userRole === 'admin'

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        organizationId,
        loading,
        error,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
        isViewer,
        isAdmin,
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
