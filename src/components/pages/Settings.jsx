import { useAuth } from '../../context/AuthContext'

export default function Settings() {
  const { user } = useAuth()

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl">
        <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-6 md:mb-8">Instellingen</h1>

        <div className="space-y-6">
          {/* Profile Section */}
          <div className="bg-white rounded-lg shadow p-5 md:p-8">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4">Profiel</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <p className="text-base md:text-lg text-gray-900">{user?.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Volledige naam
                </label>
                <p className="text-base md:text-lg text-gray-900">
                  {user?.user_metadata?.full_name || 'Niet ingesteld'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account ID
                </label>
                <p className="text-sm text-gray-500 font-mono break-all">{user?.id}</p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition cursor-pointer">
                  Profiel aanpassen
                </button>
              </div>
            </div>
          </div>

          {/* Account Settings */}
          <div className="bg-white rounded-lg shadow p-5 md:p-8">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4">Account</h2>
            <p className="text-gray-600 mb-6">Beheer je accountinstellingen.</p>
            <button className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition cursor-pointer">
              Wachtwoord wijzigen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
