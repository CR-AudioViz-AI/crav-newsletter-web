'use client';

import { useState } from 'react';

export default function AuthDebugPage() {
  const [token, setToken] = useState('');
  const [claims, setClaims] = useState<any>(null);

  const generateToken = async () => {
    const response = await fetch('/auth/dev-token?user=demo@crav.ai&org=demo&ws=demo&role=owner');
    const data = await response.json();
    setToken(data.token);

    const parts = data.token.split('.');
    const payload = JSON.parse(atob(parts[1]));
    setClaims(payload);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Auth Debug</h1>

        <div className="space-y-6">
          <div>
            <button
              onClick={generateToken}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Generate Dev Token
            </button>
          </div>

          {token && (
            <>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
                <h2 className="font-semibold mb-2">Token:</h2>
                <pre className="text-xs overflow-x-auto">{token}</pre>
              </div>

              {claims && (
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
                  <h2 className="font-semibold mb-2">Decoded Claims:</h2>
                  <pre className="text-sm">{JSON.stringify(claims, null, 2)}</pre>
                </div>
              )}

              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
                <h2 className="font-semibold mb-2">Usage:</h2>
                <pre className="text-sm">Authorization: Bearer {token.substring(0, 50)}...</pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
