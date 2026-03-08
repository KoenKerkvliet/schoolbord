export default function Settings() {
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl">
        <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-6 md:mb-8">Instellingen</h1>

        <div className="space-y-6">
          {/* Account Settings */}
          <div className="bg-white rounded-lg shadow p-5 md:p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Account</h2>
            <p className="text-gray-600 mb-6">Beheer je accountinstellingen.</p>
            <button className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition">
              Wachtwoord wijzigen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

