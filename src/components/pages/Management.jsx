import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabaseClient'

export default function Management() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('organizations')

  return (
    <div className="p-8">
      <div className="max-w-5xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Beheer</h1>
        <p className="text-gray-600 mb-8">Beheer organisaties en gebruikers</p>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('organizations')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'organizations'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Organisaties
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Gebruikers
          </button>
        </div>

        {activeTab === 'organizations' && <OrganizationsTab userId={user?.id} />}
        {activeTab === 'users' && <UsersTab />}
      </div>
    </div>
  )
}

// ==================== ORGANIZATIONS TAB ====================

function OrganizationsTab({ userId }) {
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [newOrgName, setNewOrgName] = useState('')
  const [editingOrg, setEditingOrg] = useState(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    fetchOrgs()
  }, [])

  const fetchOrgs = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .order('name')
    if (data) setOrgs(data)
    setLoading(false)
  }

  const createOrg = async (e) => {
    e.preventDefault()
    if (!newOrgName.trim()) return
    setMessage('')

    try {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: newOrgName.trim() })
        .select()
        .single()

      if (orgError) throw orgError

      // Create Home page
      await supabase.from('pages').insert({
        organization_id: orgData.id,
        title: 'Home',
        slug: 'home',
        content: '',
        is_published: true,
        created_by: userId,
      })

      setMessage(`Organisatie "${newOrgName}" aangemaakt met Home pagina`)
      setNewOrgName('')
      fetchOrgs()
    } catch (err) {
      setMessage(`Fout: ${err.message}`)
    }
  }

  const startEdit = (org) => {
    setEditingOrg(org.id)
    setEditName(org.name)
  }

  const saveEdit = async (orgId) => {
    if (!editName.trim()) return
    setMessage('')

    const { error } = await supabase
      .from('organizations')
      .update({ name: editName.trim() })
      .eq('id', orgId)

    if (error) {
      setMessage(`Fout: ${error.message}`)
    } else {
      setMessage('Organisatie bijgewerkt')
      setEditingOrg(null)
      fetchOrgs()
    }
  }

  const deleteOrg = async (id, name) => {
    if (!confirm(`Weet je zeker dat je "${name}" wilt verwijderen? Alle pagina's en koppelingen worden ook verwijderd.`)) return
    setMessage('')

    const { error } = await supabase.from('organizations').delete().eq('id', id)
    if (error) {
      setMessage(`Fout: ${error.message}`)
    } else {
      setMessage(`Organisatie "${name}" verwijderd`)
      fetchOrgs()
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg ${message.startsWith('Fout') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Create org */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Nieuwe organisatie</h2>
        <form onSubmit={createOrg} className="flex gap-3">
          <input
            type="text"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            placeholder="Naam organisatie"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            Aanmaken
          </button>
        </form>
      </div>

      {/* Org list */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Organisaties ({orgs.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-6 text-gray-500">Laden...</div>
        ) : orgs.length === 0 ? (
          <div className="p-6 text-gray-400 text-center">Geen organisaties</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {orgs.map((org) => (
              <div key={org.id} className="px-6 py-4 flex items-center justify-between">
                {editingOrg === org.id ? (
                  <div className="flex-1 flex gap-3 mr-4">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(org.id)}
                    />
                    <button
                      onClick={() => saveEdit(org.id)}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-medium hover:bg-green-200"
                    >
                      Opslaan
                    </button>
                    <button
                      onClick={() => setEditingOrg(null)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200"
                    >
                      Annuleer
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="font-medium text-gray-900">{org.name}</span>
                      <span className="ml-3 text-xs text-gray-400">{org.id.slice(0, 8)}...</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(org)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium hover:bg-blue-200 transition"
                      >
                        Bewerk
                      </button>
                      <button
                        onClick={() => deleteOrg(org.id, org.name)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200 transition"
                      >
                        Verwijder
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== USERS TAB ====================

function UsersTab() {
  const [assignments, setAssignments] = useState([])
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  // Add user form
  const [assignEmail, setAssignEmail] = useState('')
  const [assignOrgId, setAssignOrgId] = useState('')
  const [assignRole, setAssignRole] = useState('viewer')

  // Edit user
  const [editingUser, setEditingUser] = useState(null)
  const [editOrgId, setEditOrgId] = useState('')
  const [editRole, setEditRole] = useState('')

  const roleMap = { super_admin: 1, admin: 2, writer: 3, viewer: 4 }
  const roleLabels = { super_admin: 'Super Admin', admin: 'Admin', writer: 'Writer', viewer: 'Viewer' }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [{ data: assignData }, { data: orgData }] = await Promise.all([
      supabase
        .from('user_organization_roles')
        .select('id, user_id, organization_id, roles (name), organizations (name)')
        .order('created_at', { ascending: false }),
      supabase.from('organizations').select('*').order('name'),
    ])
    if (assignData) setAssignments(assignData)
    if (orgData) setOrgs(orgData)
    setLoading(false)
  }

  const addUser = async (e) => {
    e.preventDefault()
    if (!assignEmail || !assignOrgId || !assignRole) return
    setMessage('')

    const { data: userData } = await supabase
      .from('auth_users_view')
      .select('id')
      .eq('email', assignEmail)
      .single()

    if (!userData) {
      setMessage(`Fout: Gebruiker "${assignEmail}" niet gevonden`)
      return
    }

    const { error } = await supabase.from('user_organization_roles').upsert(
      {
        user_id: userData.id,
        organization_id: assignOrgId,
        role_id: roleMap[assignRole],
      },
      { onConflict: 'user_id,organization_id' }
    )

    if (error) {
      setMessage(`Fout: ${error.message}`)
    } else {
      setMessage(`Gebruiker "${assignEmail}" toegevoegd als ${roleLabels[assignRole]}`)
      setAssignEmail('')
      fetchData()
    }
  }

  const startEditUser = (assignment) => {
    setEditingUser(assignment.id)
    setEditOrgId(assignment.organization_id)
    setEditRole(assignment.roles?.name || 'viewer')
  }

  const saveUserEdit = async (assignment) => {
    setMessage('')

    // Update organization (move user)
    const updates = { role_id: roleMap[editRole] }
    if (editOrgId !== assignment.organization_id) {
      updates.organization_id = editOrgId
    }

    const { error } = await supabase
      .from('user_organization_roles')
      .update(updates)
      .eq('id', assignment.id)

    if (error) {
      setMessage(`Fout: ${error.message}`)
    } else {
      setMessage('Gebruiker bijgewerkt')
      setEditingUser(null)
      fetchData()
    }
  }

  const removeUser = async (id) => {
    if (!confirm('Weet je zeker dat je deze gebruiker wilt ontkoppelen?')) return
    setMessage('')

    const { error } = await supabase.from('user_organization_roles').delete().eq('id', id)
    if (error) {
      setMessage(`Fout: ${error.message}`)
    } else {
      setMessage('Gebruiker ontkoppeld')
      fetchData()
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg ${message.startsWith('Fout') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Add user to org */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Gebruiker koppelen</h2>
        <form onSubmit={addUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
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
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={!assignEmail || !assignOrgId}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
          >
            Koppelen
          </button>
        </form>
      </div>

      {/* Users list */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Gekoppelde gebruikers ({assignments.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-6 text-gray-500">Laden...</div>
        ) : assignments.length === 0 ? (
          <div className="p-6 text-gray-400 text-center">Geen gebruikers gekoppeld</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {assignments.map((a) => (
              <div key={a.id} className="px-6 py-4">
                {editingUser === a.id ? (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-500">
                      Gebruiker: <span className="font-mono">{a.user_id.slice(0, 12)}...</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Organisatie</label>
                        <select
                          value={editOrgId}
                          onChange={(e) => setEditOrgId(e.target.value)}
                          className="w-full px-3 py-1 border border-gray-300 rounded text-sm outline-none"
                        >
                          {orgs.map((org) => (
                            <option key={org.id} value={org.id}>{org.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Rol</label>
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="w-full px-3 py-1 border border-gray-300 rounded text-sm outline-none"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="writer">Writer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveUserEdit(a)}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-medium hover:bg-green-200"
                      >
                        Opslaan
                      </button>
                      <button
                        onClick={() => setEditingUser(null)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200"
                      >
                        Annuleer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-sm font-mono text-gray-500">{a.user_id.slice(0, 12)}...</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {a.organizations?.name || 'Onbekend'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        a.roles?.name === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : a.roles?.name === 'writer'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {roleLabels[a.roles?.name] || a.roles?.name}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditUser(a)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium hover:bg-blue-200 transition"
                      >
                        Bewerk
                      </button>
                      <button
                        onClick={() => removeUser(a.id)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200 transition"
                      >
                        Verwijder
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
