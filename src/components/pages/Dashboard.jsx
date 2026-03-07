import { useAuth } from '../../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="p-8">
      <div className="max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Welkom, {user?.user_metadata?.full_name || user?.email}!
        </h1>
        <p className="text-gray-600 mb-8">
          Dit is je dashboard. Hier kan je straks al je gegevens en organisaties beheren.
        </p>

        {/* Placeholder Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Organisaties</h2>
            <p className="text-gray-600">Beheer je organisaties en teams.</p>
            <div className="mt-4 h-20 bg-gray-100 rounded flex items-center justify-center text-gray-400">
              Placeholder
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Recente Activiteit</h2>
            <p className="text-gray-600">Je recente activiteiten worden hier getoond.</p>
            <div className="mt-4 h-20 bg-gray-100 rounded flex items-center justify-center text-gray-400">
              Placeholder
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Tip</h3>
          <p className="text-blue-800">
            Ga naar je profiel of instellingen om je accountgegevens aan te passen.
          </p>
        </div>
      </div>
    </div>
  )
}
