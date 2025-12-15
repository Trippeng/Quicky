import * as React from 'react'

export function ErrorAlert({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div className="rounded border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
      {message}
    </div>
  )
}

export function InfoAlert({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div className="rounded border border-blue-200 bg-blue-50 text-blue-700 text-sm px-3 py-2">
      {message}
    </div>
  )
}
