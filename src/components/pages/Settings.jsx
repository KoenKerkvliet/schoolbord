export default function Settings() {
  return (
    <div className="p-8">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Instellingen</h1>

        <div className="space-y-6">
          {/* Account Settings */}
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Account</h2>
            <p className="text-gray-600 mb-6">
              Beheer je accountinstellingen.
            </p>
            <button className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition">
              Wachtwoord wijzigen
            </button>
          </div>

          {/* Organization Settings */}
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Organisatie</h2>
            <p className="text-gray-600">
              Organisatie-instellingen kunnen hier straks beheerd worden (als je admin bent).
            </p>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Meldingen</h2>
            <div className="space-y-4">
              <label className="flex items-center">
                <input type="checkbox" className="w-4 h-4 text-blue-500 rounded" defaultChecked />
                <span className="ml-3 text-gray-700">Email meldingen inschakelen</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="w-4 h-4 text-blue-500 rounded" defaultChecked />
                <span className="ml-3 text-gray-700">Meldingen voor teamvergaderingen</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
