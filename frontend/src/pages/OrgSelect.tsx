import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty'
import { createOrg, listOrgs, type Org } from '@/api/orgs'
import { acceptInvite } from '@/api/invites'
import { useNavigate } from 'react-router-dom'

export default function OrgSelect() {
  const navigate = useNavigate()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newOrgName, setNewOrgName] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const lastOrgId = useMemo(() => localStorage.getItem('lastOrgId'), [])

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await listOrgs()
      if (res.status === 'ok' && res.data) {
        setOrgs(res.data)
        // Auto-skip if lastOrgId is valid
        if (lastOrgId && res.data.some((o: Org) => o.id === lastOrgId)) {
          navigate('/dashboard', { replace: true })
          return
        }
      } else {
        setError(res.message || 'Failed to load orgs')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  function selectOrg(id: string) {
    localStorage.setItem('lastOrgId', id)
    navigate('/dashboard', { replace: true })
  }

  async function onCreateOrg(e: React.FormEvent) {
    e.preventDefault()
    if (newOrgName.trim().length < 2) return
    const res = await createOrg(newOrgName.trim())
    if (res.status === 'ok' && res.data) {
      localStorage.setItem('lastOrgId', res.data.id)
      navigate('/dashboard', { replace: true })
    } else {
      setError(res.message || 'Failed to create org')
    }
  }

  async function onAcceptInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteToken.trim()) return
    const res = await acceptInvite(inviteToken.trim())
    if (res.status === 'ok' && res.data?.organizationId) {
      localStorage.setItem('lastOrgId', res.data.organizationId)
      navigate('/dashboard', { replace: true })
    } else {
      setError(res.message || 'Invite acceptance failed')
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-semibold mb-2">Organization Selection</h2>
      <p className="text-sm text-muted-foreground mb-4">Create or join an organization</p>

      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-medium mb-2">Your organizations</h3>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Spinner /> <span>Loading…</span></div>
          ) : orgs.length === 0 ? (
            <EmptyState title="No organizations" description="Create an organization or accept an invite." />
          ) : (
            <ul className="space-y-2">
              {orgs.map((o) => (
                <li key={o.id}>
                  <Button className="w-full justify-start" variant="outline" onClick={() => selectOrg(o.id)}>
                    {o.name}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <form onSubmit={onCreateOrg} className="space-y-2">
            <h3 className="font-medium">Create an organization</h3>
            <Input placeholder="Organization name" value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} label="Organization name" />
            <Button type="submit">Create</Button>
          </form>

          <form onSubmit={onAcceptInvite} className="space-y-2">
            <h3 className="font-medium">Have an invite token?</h3>
            <Input placeholder="Paste invite token" value={inviteToken} onChange={(e) => setInviteToken(e.target.value)} label="Invite token" />
            <Button type="submit" variant="secondary">Accept Invite</Button>
          </form>
        </div>
      </div>
    </div>
  )
}
