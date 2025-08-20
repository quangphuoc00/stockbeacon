'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-bold text-red-600">
              Critical Application Error
            </h2>
            <p className="mb-4 text-gray-600">
              A critical error occurred that prevented the application from loading properly.
            </p>
            <div className="mb-4 rounded bg-gray-50 p-3">
              <p className="text-sm text-gray-500">
                {error.message || 'Unknown error'}
              </p>
              {error.digest && (
                <p className="mt-1 text-xs text-gray-400">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Try again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="rounded border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Go home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
