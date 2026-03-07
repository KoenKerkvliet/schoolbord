import { useAuth } from '../../context/AuthContext'

export default function Profile() {
  const { user } = useAuth()

  return (
    <div className="p-8">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Profiel</h1>

        <div className="bg-white rounded-lg shadow p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <p className="text-lg text-gray-900">{user?.email}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Volledige naam
              </label>
              <p className="text-lg text-gray-900">
                {user?.user_metadata?.full_name || 'Niet ingesteld'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account ID
              </label>
              <p className="text-sm text-gray-500 font-mono">{user?.id}</p>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <button className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition">
                Profiel aanpassen
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-600">Meer profieleigenschappen kunnen hier later worden toegevoegd.</p>
        </div>
      </div>
    </div>
  )
}
