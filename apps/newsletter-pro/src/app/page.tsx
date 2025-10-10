import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Newsletter Pro</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Enterprise Email Marketing Platform
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/campaigns"
            className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2">Campaigns</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Create and manage email campaigns
            </p>
          </Link>

          <Link
            href="/audiences"
            className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2">Audiences</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Manage contacts and segments
            </p>
          </Link>

          <Link
            href="/templates"
            className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2">Templates</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Design reusable email templates
            </p>
          </Link>

          <Link
            href="/analytics"
            className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2">Analytics</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Track performance and metrics
            </p>
          </Link>

          <Link
            href="/settings"
            className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2">Settings</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Configure workspace and integrations
            </p>
          </Link>

          <Link
            href="/api/health"
            className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2">Health</h2>
            <p className="text-gray-600 dark:text-gray-300">
              API status and diagnostics
            </p>
          </Link>
        </div>

        <div className="text-center text-sm text-gray-500 mt-8">
          <p>CRAudioVizAI Newsletter Pro v1.0.0</p>
        </div>
      </div>
    </div>
  );
}
