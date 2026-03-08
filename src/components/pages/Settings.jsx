import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabaseClient'

const SUPER_ADMIN_EMAIL = 'koen.kerkvliet@movare.nl'

export default function Settings() {
  const { user } = useAuth()
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL

  return (
    <div className="p-8">
      <div className="max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Instellingen</h1>

        <div className="space-y-6">
          {/* Account Settings */}
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Account</h2>
            <p className="text-gray-600 mb-6">Beheer je accountinstellingen.</p>
            <button className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition">
              Wachtwoord wijzigen
            </button>
          </div>

          {/* Super Admin Section */}
          {isSuperAdmin && <SuperAdminPanel />}
        </div>
      </div>
    </div>
  )
}

function SuperAdminPanel() {
  const { user } = useAuth()
  const [orgs, setOrgs] = useState([])
  const [users, setUsers] = useState([])
  const [newOrgName, setNewOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Assign user to org
  const [assignEmail, setAssignEmail] = useState('')
  const [assignOrgId, setAssignOrgId] = useState('')
  const [assignRole, setAssignRole] = useState('viewer')

  useEffect(() => {
    fetchOrgs()
    fetchUserRoles()
  }, [])

  const fetchOrgs = async () => {
    const { data } = await supabase.from('organizations').select('*').order('name')
    if (data) setOrgs(data)
  }

  const fetchUserRoles = async () => {
    const { data } = await supabase
      .from('user_organization_roles')
      .select(`
        id,
        user_id,
        organization_id,
        roles (name),
        organizations (name)
      `)
      .order('created_at', { ascending: false })
    if (data) setUsers(data)
  }

  const createOrg = async (e) => {
    e.preventDefault()
    if (!newOrgName.trim()) return
    setLoading(true)
    setMessage('')

    try {
      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: newOrgName.trim() })
        .select()
        .single()

      if (orgError) throw orgError

      // Create Home page for the new organization
      const { error: pageError } = await supabase.from('pages').insert({
        organization_id: orgData.id,
        title: 'Home',
        slug: 'home',
        content: 'Welkom op onze website!',
        is_published: true,
        created_by: user.id,
      })

      if (pageError) {
        console.error('Fout bij aanmaken Home pagina:', pageError)
        setMessage(`Organisatie aangemaakt, maar kon Home pagina niet aanmaken: ${pageError.message}`)
      } else {
        setMessage(`Organisatie "${newOrgName}" aangemaakt met Home pagina!`)
      }

      setNewOrgName('')
      fetchOrgs()
    } catch (error) {
      setMessage(`Fout: ${error.message}`)
    }
    setLoading(false)
  }

  const deleteOrg = async (id, name) => {
    if (!confirm(`Weet je zeker dat je "${name}" wilt verwijderen?`)) return

    const { error } = await supabase.from('organizations').delete().eq('id', id)
    if (error) {
      setMessage(`Fout: ${error.message}`)
    } else {
      setMessage(`Organisatie "${name}" verwijderd.`)
      fetchOrgs()
      fetchUserRoles()
    }
  }

  const assignUserToOrg = async (e) => {
    e.preventDefault()
    if (!assignEmail || !assignOrgId || !assignRole) return
    setLoading(true)
    setMessage('')

    // Look up user by email in auth.users via a custom RPC or direct lookup
    const { data: userData } = await supabase
      .from('auth_users_view')
      .select('id')
      .eq('email', assignEmail)
      .single()

    if (!userData) {
      setMessage(`Gebruiker met email "${assignEmail}" niet gevonden. Zorg dat deze eerst een account aanmaakt.`)
      setLoading(false)
      return
    }

    // Get role ID
    const roleMap = { super_admin: 1, admin: 2, writer: 3, viewer: 4 }
    const roleId = roleMap[assignRole]

    const { error } = await supabase.from('user_organization_roles').upsert(
      {
        user_id: userData.id,
        organization_id: assignOrgId,
        role_id: roleId,
      },
      { onConflict: 'user_id,organization_id' }
    )

    if (error) {
      setMessage(`Fout: ${error.message}`)
    } else {
      setMessage(`Gebruiker "${assignEmail}" toegevoegd als ${assignRole}!`)
      setAssignEmail('')
      fetchUserRoles()
    }
    setLoading(false)
  }

  const removeUserRole = async (id) => {
    const { error } = await supabase.from('user_organization_roles').delete().eq('id', id)
    if (error) {
      setMessage(`Fout: ${error.message}`)
    } else {
      setMessage('Gebruiker verwijderd uit organisatie.')
      fetchUserRoles()
    }
  }

  return (
    <>
      {/* Super Admin Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <p className="text-purple-800 font-semibold">Super Admin</p>
        <p className="text-purple-600 text-sm">Je hebt volledige beheertoegang.</p>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-lg ${message.startsWith('Fout') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Manage Organizations */}
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Organisaties</h2>

        {/* Create Org */}
        <form onSubmit={createOrg} className="flex gap-3 mb-6">
          <input
            type="text"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            placeholder="Naam nieuwe organisatie"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition disabled:opacity-50"
          >
            Toevoegen
          </button>
        </form>

        {/* Org List */}
        {orgs.length === 0 ? (
          <p className="text-gray-400">Geen organisaties gevonden.</p>
        ) : (
          <div className="space-y-2">
            {orgs.map((org) => (
              <div key={org.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium text-gray-900">{org.name}</span>
                  <span className="ml-2 text-xs text-gray-400">{org.id.slice(0, 8)}...</span>
                </div>
                <button
                  onClick={() => deleteOrg(org.id, org.name)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Verwijderen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign Users to Organizations */}
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Gebruiker aan organisatie koppelen</h2>

        <form onSubmit={assignUserToOrg} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email gebruiker</label>
            <input
              type="email"
              value={assignEmail}
              onChange={(e) => setAssignEmail(e.target.value)}
              placeholder="gebruiker@voorbeeld.nl"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organisatie</label>
              <select
                value={assignOrgId}
                onChange={(e) => setAssignOrgId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Kies organisatie</option>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select
                value={assignRole}
                onChange={(e) => setAssignRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="viewer">Viewer</option>
                <option value="writer">Writer</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !assignEmail || !assignOrgId}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition disabled:opacity-50"
          >
            Koppelen
          </button>
        </form>

        {/* Current Assignments */}
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Huidige koppelingen</h3>
        {users.length === 0 ? (
          <p className="text-gray-400">Geen koppelingen gevonden.</p>
        ) : (
          <div className="space-y-2">
            {users.map((ur) => (
              <div key={ur.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="text-sm">
                  <span className="font-medium text-gray-900">{ur.organizations?.name || 'Onbekend'}</span>
                  <span className="mx-2 text-gray-400">-</span>
                  <span className="text-gray-600">{ur.user_id.slice(0, 8)}...</span>
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {ur.roles?.name || 'Onbekend'}
                  </span>
                </div>
                <button
                  onClick={() => removeUserRole(ur.id)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Verwijderen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
