import { useEffect, useState } from 'react'
import { apiGetJson } from '@/api/client'
import { Button } from '@/components/ui/button'

type HealthDbResponse = { status: 'ok' | 'error'; data?: { db: string; now?: string }; message?: string; detail?: string }

export default function HealthDb() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<HealthDbResponse | null>(null)

  async function check() {
    setLoading(true)
    try {
      const res = await apiGetJson<HealthDbResponse>('/api/health/db')
      setResult(res)
    } catch (e: any) {
      setResult({ status: 'error', message: e?.message ?? 'Request failed' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    check()
  }, [])

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold">DB Health</h2>
        <Button onClick={check} disabled={loading}>
          {loading ? 'Checking…' : 'Recheck'}
        </Button>
      </div>
      <div className="space-y-2">
        <div>
          <span className="font-medium">DB Status:</span> {result?.data?.db ?? '—'}
        </div>
        <div>
          <span className="font-medium">DB Time (UTC):</span> {result?.data?.now ?? '—'}
        </div>
        <pre className="bg-muted/50 border rounded p-3 text-xs overflow-auto">
          {result ? JSON.stringify(result, null, 2) : '…'}
        </pre>
      </div>
    </div>
  )
}
