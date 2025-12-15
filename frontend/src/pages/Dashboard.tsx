import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { listTeams, createTeam, patchTeam, type Team, deleteTeam } from '@/api/teams'
import { listLists, createList, patchList, type TaskList, deleteList } from '@/api/lists'
import { listTasks, createTask, patchTask, type Task, deleteTask } from '@/api/tasks'
import { Input } from '@/components/ui/input'
import { ErrorAlert } from '@/components/ui/alert'
import { listMessages, sendMessage, type TaskMessage } from '@/api/messages'
import { getMe } from '@/api/users'
import { listOrgs, type Org, getOrgSettings, patchOrgSettings } from '@/api/orgs'

type Panel = 'teams' | 'lists' | 'tasks' | 'chat'

const panels: { key: Panel; title: string; desc: string }[] = [
  { key: 'teams', title: 'Teams', desc: 'Manage teams in the org' },
  { key: 'lists', title: 'Task Lists', desc: 'Lists within a team' },
  { key: 'tasks', title: 'Tasks', desc: 'Work items and statuses' },
  { key: 'chat', title: 'Chat', desc: 'Messages for the selected task' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const lastOrgId = localStorage.getItem('lastOrgId')
  const [active, setActive] = useState<Panel>('teams')
  // Org-wide UI settings (server-backed)
  type UiSettings = { hideTeams: boolean; hideLists: boolean }
  const [uiSettings, setUiSettings] = useState<UiSettings>({ hideTeams: false, hideLists: false })
  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!lastOrgId) { if (mounted) setUiSettings({ hideTeams: false, hideLists: false }); return }
      const res = await getOrgSettings(lastOrgId)
      if (mounted && res.status === 'ok') {
        const s = { hideTeams: !!res.data?.hideTeams, hideLists: !!res.data?.hideLists }
        setUiSettings(s)
      }
    }
    load()
    return () => { mounted = false }
  }, [lastOrgId])
  const { hideTeams, hideLists } = uiSettings
  const visiblePanels = panels.filter(p => !(hideTeams && p.key === 'teams') && !(hideLists && p.key === 'lists'))
  const activeIndex = Math.max(0, visiblePanels.findIndex(p => p.key === active))
  const [orgName, setOrgName] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [teamsPages, setTeamsPages] = useState<Team[][]>([])
  const [teamsPageIndex, setTeamsPageIndex] = useState(0)
  const [lists, setLists] = useState<TaskList[]>([])
  const [listsPages, setListsPages] = useState<TaskList[][]>([])
  const [listsPageIndex, setListsPageIndex] = useState(0)
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksPages, setTasksPages] = useState<Task[][]>([])
  const [tasksPageIndex, setTasksPageIndex] = useState(0)
  const [messages, setMessages] = useState<TaskMessage[]>([])
  const [messagesPages, setMessagesPages] = useState<TaskMessage[][]>([])
  const [messagesPageIndex, setMessagesPageIndex] = useState(0)
  const [teamsCursor, setTeamsCursor] = useState<string | null>(null)
  const [listsCursor, setListsCursor] = useState<string | null>(null)
  const [tasksCursor, setTasksCursor] = useState<string | null>(null)
  const [messagesCursor, setMessagesCursor] = useState<string | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [loadingLists, setLoadingLists] = useState(false)
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [creatingList, setCreatingList] = useState(false)
  const [creatingTask, setCreatingTask] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newListName, setNewListName] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  // Settings UI state
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [canManageSettings, setCanManageSettings] = useState(false)
  const [showAddTeam, setShowAddTeam] = useState(false)
  const [showAddList, setShowAddList] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const messagesEndRef = (typeof document !== 'undefined') ? (document.createElement('div')) : null
  // Feature flag to use new mobile carousel
  const [useCarousel] = useState(true)
  // Mobile horizontal scroll container + helpers
  const mobileScrollRef = useRef<HTMLDivElement | null>(null)
  const scrollingByCodeRef = useRef(false)
  const ioRatiosRef = useRef<Map<Element, number>>(new Map())
  const doScrollToIndex = (index: number) => {
    const el = mobileScrollRef.current
    if (!el) return
    const child = el.children[index] as HTMLElement | undefined
    if (!child) return
    scrollingByCodeRef.current = true
    try {
      child.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
    } catch {
      el.scrollLeft = child.offsetLeft
    }
    // Fallback to release the flag if 'scrollend' isn't supported
    window.setTimeout(() => { scrollingByCodeRef.current = false }, 400)
  }
  useEffect(() => {
    const el = mobileScrollRef.current
    if (!el) return
    const onScrollEnd = () => { scrollingByCodeRef.current = false }
    el.addEventListener('scrollend', onScrollEnd as any)
    return () => {
      el.removeEventListener('scrollend', onScrollEnd as any)
    }
  }, [])
  // Only perform programmatic scrolls when we initiated the active change
  useEffect(() => {
    if (!useCarousel) return
    if (!scrollingByCodeRef.current) return
    doScrollToIndex(activeIndex)
  }, [active, activeIndex, useCarousel])
  // Observe which panel is most visible to drive `active` (smooth, no twitch)
  useEffect(() => {
    if (!useCarousel) return
    const el = mobileScrollRef.current
    if (!el) return
    const children = Array.from(el.children) as HTMLElement[]
    ioRatiosRef.current.clear()
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => ioRatiosRef.current.set(en.target, en.intersectionRatio))
      if (scrollingByCodeRef.current) return
      let bestIdx = 0
      let bestRatio = -1
      children.forEach((ch, idx) => {
        const r = ioRatiosRef.current.get(ch) ?? 0
        if (r > bestRatio) { bestRatio = r; bestIdx = idx }
      })
      if (bestRatio >= 0.5) {
        const next = visiblePanels[bestIdx]?.key
        if (next !== active) setActive(next)
      }
    }, { root: el, threshold: [0, 0.25, 0.5, 0.75, 1] })
    children.forEach(ch => obs.observe(ch))
    return () => {
      children.forEach(ch => obs.unobserve(ch))
      obs.disconnect()
    }
  }, [useCarousel, active, visiblePanels.length])
  const goPrev = () => {
    const idx = Math.max(0, activeIndex - 1)
    if (idx !== activeIndex) {
      scrollingByCodeRef.current = true
      setActive(visiblePanels[idx].key)
    }
  }
  const goNext = () => {
    const idx = Math.min(visiblePanels.length - 1, activeIndex + 1)
    if (idx !== activeIndex) {
      scrollingByCodeRef.current = true
      setActive(visiblePanels[idx].key)
    }
  }

  const onChangeOrg = () => {
    navigate('/org?switch=1')
  }

  // Edit modal state
  const [editTarget, setEditTarget] = useState<null | { type: 'team' | 'list' | 'task'; item: any }>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStatus, setEditStatus] = useState('REQUIRES_ATTENTION')
  const [savingEdit, setSavingEdit] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const openEdit = (type: 'team' | 'list' | 'task', item: any) => {
    setEditTarget({ type, item })
    if (type === 'task') {
      setEditTitle(item.title ?? '')
      setEditDescription(item.description ?? '')
      setEditStatus(item.status ?? 'REQUIRES_ATTENTION')
    } else if (type === 'team' || type === 'list') {
      setEditTitle(item.name ?? '')
    }
  }
  const closeEdit = () => {
    setEditTarget(null)
    setEditTitle('')
    setEditDescription('')
    setEditStatus('REQUIRES_ATTENTION')
    setSavingEdit(false)
    setActionBusy(false)
    setEditError(null)
  }
  const saveEdit = async () => {
    if (!editTarget) return
    setEditError(null)
    try {
      setSavingEdit(true)
      if (editTarget.type === 'task') {
        const payload: any = {}
        if (editTitle.trim().length > 0 && editTitle !== editTarget.item.title) payload.title = editTitle.trim()
        if ((editDescription || '') !== (editTarget.item.description || '')) payload.description = editDescription
        if (editStatus && editStatus !== editTarget.item.status) payload.status = editStatus
        const res = await patchTask(editTarget.item.id, payload)
        setSavingEdit(false)
        if (res.status === 'ok' && res.data) {
          setTasks((prev) => prev.map(t => t.id === res.data!.id ? { ...t, ...res.data! } : t))
          closeEdit()
        } else {
          setEditError(res.message ?? 'Failed to save changes')
        }
      } else if (editTarget.type === 'team') {
        const name = editTitle.trim()
        const res = await patchTeam(editTarget.item.id, { name })
        setSavingEdit(false)
        if (res.status === 'ok' && res.data) {
          setTeams((prev) => prev.map(x => x.id === res.data!.id ? { ...x, ...res.data! } : x))
          closeEdit()
        } else {
          setEditError(res.message ?? 'Failed to save changes')
        }
      } else if (editTarget.type === 'list') {
        const name = editTitle.trim()
        const res = await patchList(editTarget.item.id, { name })
        setSavingEdit(false)
        if (res.status === 'ok' && res.data) {
          setLists((prev) => prev.map(x => x.id === res.data!.id ? { ...x, ...res.data! } : x))
          closeEdit()
        } else {
          setEditError(res.message ?? 'Failed to save changes')
        }
      }
    } catch (e: any) {
      setSavingEdit(false)
      setEditError('Unexpected error saving changes')
    }
  }

  // Archive and Delete actions from edit modal
  const doArchive = async () => {
    if (!editTarget) return
    setEditError(null)
    setActionBusy(true)
    try {
      if (editTarget.type === 'team') {
        const res = await patchTeam(editTarget.item.id, { archived: true })
        setActionBusy(false)
        if (res.status === 'ok') {
          setTeams(prev => prev.filter(t => t.id !== editTarget.item.id))
          if (selectedTeamId === editTarget.item.id) {
            setSelectedTeamId(null)
            setSelectedListId(null)
            setSelectedTaskId(null)
            if (lastOrgId) setLastTeamByOrg(prev => ({ ...prev, [lastOrgId]: null }))
          }
          closeEdit()
        } else {
          setEditError(res.message ?? 'Failed to archive team')
        }
      } else if (editTarget.type === 'list') {
        const res = await patchList(editTarget.item.id, { archived: true })
        setActionBusy(false)
        if (res.status === 'ok') {
          setLists(prev => prev.filter(l => l.id !== editTarget.item.id))
          if (selectedListId === editTarget.item.id) {
            setSelectedListId(null)
            setSelectedTaskId(null)
          }
          closeEdit()
        } else {
          setEditError(res.message ?? 'Failed to archive list')
        }
      } else if (editTarget.type === 'task') {
        const res = await patchTask(editTarget.item.id, { archived: true })
        setActionBusy(false)
        if (res.status === 'ok') {
          setTasks(prev => prev.filter(t => t.id !== editTarget.item.id))
          if (selectedTaskId === editTarget.item.id) {
            setSelectedTaskId(null)
          }
          closeEdit()
        } else {
          setEditError(res.message ?? 'Failed to archive task')
        }
      }
    } catch (e) {
      setActionBusy(false)
      setEditError('Unexpected error archiving')
    }
  }

  const doDelete = async () => {
    if (!editTarget) return
    setEditError(null)
    setActionBusy(true)
    try {
      if (editTarget.type === 'team') {
        const res = await deleteTeam(editTarget.item.id)
        setActionBusy(false)
        if (res.status === 'ok') {
          setTeams(prev => prev.filter(t => t.id !== editTarget.item.id))
          if (selectedTeamId === editTarget.item.id) {
            setSelectedTeamId(null)
            setSelectedListId(null)
            setSelectedTaskId(null)
            if (lastOrgId) setLastTeamByOrg(prev => ({ ...prev, [lastOrgId]: null }))
          }
          closeEdit()
        } else {
          setEditError(res.message ?? 'Failed to delete team')
        }
      } else if (editTarget.type === 'list') {
        const res = await deleteList(editTarget.item.id)
        setActionBusy(false)
        if (res.status === 'ok') {
          setLists(prev => prev.filter(l => l.id !== editTarget.item.id))
          if (selectedListId === editTarget.item.id) {
            setSelectedListId(null)
            setSelectedTaskId(null)
          }
          closeEdit()
        } else {
          setEditError(res.message ?? 'Failed to delete list')
        }
      } else if (editTarget.type === 'task') {
        const res = await deleteTask(editTarget.item.id)
        setActionBusy(false)
        if (res.status === 'ok') {
          setTasks(prev => prev.filter(t => t.id !== editTarget.item.id))
          if (selectedTaskId === editTarget.item.id) {
            setSelectedTaskId(null)
          }
          closeEdit()
        } else {
          setEditError(res.message ?? 'Failed to delete task')
        }
      }
    } catch (e) {
      setActionBusy(false)
      setEditError('Unexpected error deleting')
    }
  }

  // Remember last selection per team (persisted to localStorage)
  type LastSel = { listId?: string | null; taskId?: string | null }
  const [lastSelByTeam, setLastSelByTeam] = useState<Record<string, LastSel>>(() => {
    try {
      const raw = localStorage.getItem('lastSelByTeam')
      return raw ? (JSON.parse(raw) as Record<string, LastSel>) : {}
    } catch {
      return {}
    }
  })
  useEffect(() => {
    try { localStorage.setItem('lastSelByTeam', JSON.stringify(lastSelByTeam)) } catch {}
  }, [lastSelByTeam])

  // Remember last selected task per list (persisted)
  const [lastTaskByList, setLastTaskByList] = useState<Record<string, string | null>>(() => {
    try {
      const raw = localStorage.getItem('lastTaskByList')
      return raw ? (JSON.parse(raw) as Record<string, string | null>) : {}
    } catch {
      return {}
    }
  })
  useEffect(() => {
    try { localStorage.setItem('lastTaskByList', JSON.stringify(lastTaskByList)) } catch {}
  }, [lastTaskByList])

  // Remember last selected team per org (persisted)
  const [lastTeamByOrg, setLastTeamByOrg] = useState<Record<string, string | null>>(() => {
    try {
      const raw = localStorage.getItem('lastTeamByOrg')
      return raw ? (JSON.parse(raw) as Record<string, string | null>) : {}
    } catch {
      return {}
    }
  })
  useEffect(() => {
    try { localStorage.setItem('lastTeamByOrg', JSON.stringify(lastTeamByOrg)) } catch {}
  }, [lastTeamByOrg])

  // Remember last active panel per org (persisted)
  const [lastPanelByOrg, setLastPanelByOrg] = useState<Record<string, Panel>>(() => {
    try {
      const raw = localStorage.getItem('lastPanelByOrg')
      return raw ? (JSON.parse(raw) as Record<string, Panel>) : {}
    } catch {
      return {}
    }
  })
  useEffect(() => {
    try { localStorage.setItem('lastPanelByOrg', JSON.stringify(lastPanelByOrg)) } catch {}
  }, [lastPanelByOrg])
  // Persist active panel selection per org whenever it changes
  useEffect(() => {
    if (lastOrgId) setLastPanelByOrg(prev => ({ ...prev, [lastOrgId]: active }))
  }, [active, lastOrgId])

  const rememberList = (teamId: string, listId: string | null) => {
    setLastSelByTeam(prev => ({ ...prev, [teamId]: { ...(prev[teamId] || {}), listId, taskId: null } }))
  }
  const rememberTask = (teamId: string, taskId: string | null) => {
    setLastSelByTeam(prev => ({ ...prev, [teamId]: { ...(prev[teamId] || {}), taskId } }))
    if (selectedListId) {
      setLastTaskByList(prev => ({ ...prev, [selectedListId]: taskId }))
    }
  }

  // Toggle handlers with validation
  const onToggleHideTeams = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettingsError(null)
    const next = e.target.checked
    if (next) {
      // turning ON hideTeams requires at most one team (0 or 1)
      const tms = await fetchAllTeams()
      if (tms.length > 1) { setSettingsError('Cannot hide Teams: more than one team exists.'); return }
      if (!lastOrgId) { setSettingsError('No organization selected.'); return }
      const res = await patchOrgSettings(lastOrgId, { hideTeams: true })
      if (res.status !== 'ok') { setSettingsError(res.message ?? 'Failed to update setting'); return }
      setUiSettings(s => ({ ...s, hideTeams: true }))
      // If currently active panel becomes hidden, move focus to first visible
      if (active === 'teams') setActive(visiblePanels.find(p => p.key !== 'teams')?.key || 'lists')
      // Ensure selection is that sole team
      if (tms.length === 1) setSelectedTeamId(tms[0].id)
    } else {
      if (!lastOrgId) { setSettingsError('No organization selected.'); return }
      const res = await patchOrgSettings(lastOrgId, { hideTeams: false })
      if (res.status !== 'ok') { setSettingsError(res.message ?? 'Failed to update setting'); return }
      setUiSettings(s => ({ ...s, hideTeams: false }))
    }
  }

  const onToggleHideLists = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettingsError(null)
    const next = e.target.checked
    if (next) {
      // turning ON hideLists requires each team to have at most one list (0 or 1)
      const tms = await fetchAllTeams()
      for (const t of tms) {
        const ls = await fetchAllLists(t.id)
        if (ls.length > 1) { setSettingsError('Cannot hide Task Lists: a team has more than one list.'); return }
      }
      if (!lastOrgId) { setSettingsError('No organization selected.'); return }
      const res = await patchOrgSettings(lastOrgId, { hideLists: true })
      if (res.status !== 'ok') { setSettingsError(res.message ?? 'Failed to update setting'); return }
      setUiSettings(s => ({ ...s, hideLists: true }))
      if (active === 'lists') setActive(visiblePanels.find(p => p.key !== 'lists')?.key || 'tasks')
      // Ensure for current team we have a list selected
      if (selectedTeamId) {
        const ls = await fetchAllLists(selectedTeamId)
        if (ls.length === 1) setSelectedListId(ls[0].id)
      }
    } else {
      if (!lastOrgId) { setSettingsError('No organization selected.'); return }
      const res = await patchOrgSettings(lastOrgId, { hideLists: false })
      if (res.status !== 'ok') { setSettingsError(res.message ?? 'Failed to update setting'); return }
      setUiSettings(s => ({ ...s, hideLists: false }))
    }
  }

  // Centralized selection handlers (keeps previous state per team)
  const handleTeamSelect = (teamId: string) => {
    setSelectedTeamId(teamId)
    if (lastOrgId) setLastTeamByOrg(prev => ({ ...prev, [lastOrgId]: teamId }))
    const mem = lastSelByTeam[teamId]
    setSelectedListId(mem?.listId ?? null)
    setSelectedTaskId(mem?.taskId ?? null)
    setActive('lists')
  }
  const handleListSelect = (listId: string) => {
    if (!selectedTeamId) return
    rememberList(selectedTeamId, listId)
    setSelectedListId(listId)
    const rememberedTask = lastTaskByList[listId] || null
    setSelectedTaskId(rememberedTask ?? null)
    setActive('tasks')
  }
  const handleTaskSelect = (taskId: string) => {
    if (!selectedTeamId) return
    rememberTask(selectedTeamId, taskId)
    setSelectedTaskId(taskId)
    setActive('chat')
  }

  // Helpers for create/send actions and Enter-to-submit
  const doCreateTeam = async () => {
    if (!lastOrgId || creatingTeam || newTeamName.trim().length < 2) return
    setCreateError(null)
    setCreatingTeam(true)
    const res = await createTeam(lastOrgId, { name: newTeamName.trim() })
    setCreatingTeam(false)
    if (res.status === 'ok' && res.data) {
      setNewTeamName('')
      setShowAddTeam(false)
      const refreshed = await listTeams(lastOrgId)
      if (refreshed.status === 'ok' && refreshed.data) setTeams(refreshed.data)
    } else {
      setCreateError(res.message ?? 'Unknown error')
    }
  }

  const doCreateList = async () => {
    // Ensure a team context even if none is selected
    let teamId = selectedTeamId
    if (!teamId) {
      teamId = await ensureSingleTeam()
      if (!teamId) { setCreateError('Select a team first or ensure only one team exists.'); return }
      setSelectedTeamId(teamId)
      if (lastOrgId) setLastTeamByOrg(prev => ({ ...prev, [lastOrgId]: teamId! }))
    }
    if (!teamId || creatingList || newListName.trim().length < 2) return
    setCreateError(null)
    setCreatingList(true)
    const res = await createList(teamId, { name: newListName.trim() })
    setCreatingList(false)
    if (res.status === 'ok' && res.data) {
      setNewListName('')
      setShowAddList(false)
      const refreshed = await listLists(teamId)
      if (refreshed.status === 'ok' && refreshed.data) setLists(refreshed.data)
    } else {
      setCreateError(res.message ?? 'Unknown error')
    }
  }

  const doCreateTask = async () => {
    // Ensure a valid list context even if nothing is selected yet
    let listId = selectedListId
    if (!listId) {
      // Determine or create a single team when none exists
      let teamId = selectedTeamId
      // If teams panel is hidden or no team selected, try to ensure a single team exists
      if (!teamId) {
        teamId = await ensureSingleTeam()
        if (!teamId) { setCreateError('Select a team first or ensure only one team exists.'); return }
        setSelectedTeamId(teamId)
        if (lastOrgId) setLastTeamByOrg(prev => ({ ...prev, [lastOrgId]: teamId! }))
      }
      // Determine or create a single list for that team when none exists
      const ensuredListId = await ensureSingleList(teamId)
      if (!ensuredListId) { setCreateError('Select a list first or ensure only one list exists in the team.'); return }
      listId = ensuredListId
      setSelectedListId(listId)
    }
    if (!listId || creatingTask || newTaskTitle.trim().length < 2) return
    setCreateError(null)
    setCreatingTask(true)
    const res = await createTask(listId, { title: newTaskTitle.trim() })
    setCreatingTask(false)
    if (res.status === 'ok' && res.data) {
      setNewTaskTitle('')
      setShowAddTask(false)
      const refreshed = await listTasks(listId)
      if (refreshed.status === 'ok' && refreshed.data) setTasks(refreshed.data)
    } else {
      setCreateError(res.message ?? 'Unknown error')
    }
  }

  const doSendMessage = async () => {
    if (!selectedTaskId || sendingMessage || chatInput.trim().length === 0) return
    setChatError(null)
    setSendingMessage(true)
    const res = await sendMessage(selectedTaskId, chatInput)
    setSendingMessage(false)
    if (res.status === 'ok' && res.data) {
      setChatInput('')
      setMessages((prev) => [...prev, res.data as TaskMessage])
      const refreshed = await listMessages(selectedTaskId)
      if (refreshed.status === 'ok' && refreshed.data) setMessages(refreshed.data)
    } else {
      setChatError(res.message ?? 'Failed to send message')
    }
  }

  function colorFromId(id: string) {
    let hash = 0
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
    const hue = Math.abs(hash) % 360
    return `hsl(${hue} 70% 75%)`
  }
  function initialsFromId(id: string) {
    return id.slice(0, 2).toUpperCase()
  }
  function taskStatusClasses(status: string, selected: boolean) {
    const base = 'transition-colors'
    const map: Record<string, string> = {
      AT_RISK: 'bg-red-100 hover:bg-red-200',
      COMPLETE: 'bg-green-100 hover:bg-green-200',
      IN_PROGRESS: 'bg-blue-100 hover:bg-blue-200',
      REQUIRES_ATTENTION: 'bg-yellow-100 hover:bg-yellow-200',
    }
    const color = map[status] || 'bg-gray-100 hover:bg-gray-200'
    const sel = selected ? 'ring-2 ring-primary' : ''
    return `${base} ${color} ${sel}`.trim()
  }
  // Helpers to enforce single team/list when features are hidden
  const fetchAllTeams = async (): Promise<Team[]> => {
    const out: Team[] = []
    if (!lastOrgId) return out
    let cursor: string | null = null
    do {
      const res = await listTeams(lastOrgId, 100, cursor || undefined)
      if (res.status !== 'ok' || !res.data) break
      out.push(...(res.data as Team[]))
      cursor = res.meta?.nextCursor ?? null
    } while (cursor)
    return out
  }
  const fetchAllLists = async (teamId: string): Promise<TaskList[]> => {
    const out: TaskList[] = []
    let cursor: string | null = null
    do {
      const res = await listLists(teamId, 100, cursor || undefined)
      if (res.status !== 'ok' || !res.data) break
      out.push(...(res.data as TaskList[]))
      cursor = res.meta?.nextCursor ?? null
    } while (cursor)
    return out
  }
  const ensureSingleTeam = async (): Promise<string | null> => {
    const tms = await fetchAllTeams()
    if (tms.length === 1) return tms[0].id
    if (tms.length === 0) {
      if (!lastOrgId) return null
      const cr = await createTeam(lastOrgId, { name: 'General' })
      if (cr.status === 'ok' && cr.data) return cr.data.id
      return null
    }
    return null
  }
  const ensureSingleList = async (teamId: string): Promise<string | null> => {
    const ls = await fetchAllLists(teamId)
    if (ls.length === 1) return ls[0].id
    if (ls.length === 0) {
      const cr = await createList(teamId, { name: 'General' })
      if (cr.status === 'ok' && cr.data) return cr.data.id
      return null
    }
    return null
  }
  // Load org name
  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!lastOrgId) { setOrgName(null); return }
      const res = await listOrgs()
      if (mounted && res.status === 'ok' && res.data) {
        const found = (res.data as Org[]).find(o => o.id === lastOrgId)
        setOrgName(found?.name ?? null)
        setCanManageSettings(found ? (found.role === 'OWNER' || found.role === 'ADMIN') : false)
      }
    }
    load()
    return () => { mounted = false }
  }, [lastOrgId])

  // Load current user
  useEffect(() => {
    let mounted = true
    const load = async () => {
      const res = await getMe()
      if (mounted && res.status === 'ok' && res.data) setCurrentUserId(res.data.id)
    }
    load()
    return () => { mounted = false }
  }, [])

  // Load base data for selections
  useEffect(() => {
    const loadTeams = async () => {
      if (!lastOrgId) return
      setLoadingTeams(true)
      const res = await listTeams(lastOrgId)
      setLoadingTeams(false)
      if (res.status === 'ok' && res.data) {
        const data = res.data as Team[]
        setTeams(data)
        setTeamsPages([data])
        setTeamsPageIndex(0)
        setTeamsCursor(res.meta?.nextCursor ?? null)
        const rememberedTeam = lastTeamByOrg[lastOrgId]
        if (rememberedTeam && data.some(d => d.id === rememberedTeam)) {
          setSelectedTeamId(rememberedTeam)
        }
        const rememberedPanel = lastPanelByOrg[lastOrgId]
        if (rememberedPanel) {
          setActive(rememberedPanel)
        }
      }
    }
    loadTeams()
  }, [lastOrgId])

  useEffect(() => {
    // reset list/task selection on team change
    setSelectedListId(null)
    setSelectedTaskId(null)
    setLists([])
    setTasks([])
    setMessages([])
    setListsCursor(null)
    setTasksCursor(null)
    setMessagesCursor(null)
    const loadListsNow = async () => {
      if (!selectedTeamId) return
      setLoadingLists(true)
      const res = await listLists(selectedTeamId)
      setLoadingLists(false)
      if (res.status === 'ok' && res.data) {
        const data = res.data as TaskList[]
        setLists(data)
        setListsPages([data])
        setListsPageIndex(0)
        setListsCursor(res.meta?.nextCursor ?? null)
        // Try restore last selected list for this team if present and exists
        const mem = lastSelByTeam[selectedTeamId]
        if (mem?.listId && data.some(d => d.id === mem.listId)) {
          setSelectedListId(mem.listId)
        }
      }
    }
    loadListsNow()
  }, [selectedTeamId])

  useEffect(() => {
    // reset task/chat on list change
    setSelectedTaskId(null)
    setTasks([])
    setMessages([])
    setTasksCursor(null)
    setMessagesCursor(null)
    const loadTasksNow = async () => {
      if (!selectedListId) return
      setLoadingTasks(true)
      const res = await listTasks(selectedListId)
      setLoadingTasks(false)
      if (res.status === 'ok' && res.data) {
        const data = res.data as Task[]
        setTasks(data)
        setTasksPages([data])
        setTasksPageIndex(0)
        setTasksCursor(res.meta?.nextCursor ?? null)
        // Try restore last selected task for this list
        const rememberedTask = lastTaskByList[selectedListId]
        if (rememberedTask && data.some(d => d.id === rememberedTask)) {
          setSelectedTaskId(rememberedTask)
        } else if (selectedTeamId) {
          // Fallback to old per-team memory if present
          const mem = lastSelByTeam[selectedTeamId]
          if (mem?.taskId && data.some(d => d.id === mem.taskId)) {
            setSelectedTaskId(mem.taskId)
          }
        }
      }
    }
    loadTasksNow()
  }, [selectedListId])

  useEffect(() => {
    // load messages on task change
    setMessages([])
    setMessagesCursor(null)
    const loadMessagesNow = async () => {
      if (!selectedTaskId) return
      setLoadingMessages(true)
      const res = await listMessages(selectedTaskId)
      setLoadingMessages(false)
      if (res.status === 'ok' && res.data) {
        const data = res.data as TaskMessage[]
        setMessages(data)
        setMessagesPages([data])
        setMessagesPageIndex(0)
        setMessagesCursor(res.meta?.nextCursor ?? null)
      }
    }
    loadMessagesNow()
  }, [selectedTaskId])

  // If settings hide a currently active panel, move to the first visible panel
  useEffect(() => {
    const hidden = (active === 'teams' && hideTeams) || (active === 'lists' && hideLists)
    if (hidden) {
      const first = visiblePanels[0]?.key
      if (first && first !== active) setActive(first)
    }
  }, [hideTeams, hideLists])

  // Polling by active panel
  useEffect(() => {
    let timer: any | null = null
    const fetchNow = async () => {
      if (active === 'teams' && lastOrgId) {
        const res = await listTeams(lastOrgId)
        if (res.status === 'ok' && res.data) {
          const data = res.data as Team[]
          setTeams(data)
          setTeamsCursor(res.meta?.nextCursor ?? null)
        }
      } else if (active === 'lists' && selectedTeamId) {
        const res = await listLists(selectedTeamId)
        if (res.status === 'ok' && res.data) {
          const data = res.data as TaskList[]
          setLists(data)
          setListsCursor(res.meta?.nextCursor ?? null)
        }
      } else if (active === 'tasks' && selectedListId) {
        const res = await listTasks(selectedListId)
        if (res.status === 'ok' && res.data) {
          const data = res.data as Task[]
          setTasks(data)
          setTasksCursor(res.meta?.nextCursor ?? null)
        }
      } else if (active === 'chat' && selectedTaskId) {
        const res = await listMessages(selectedTaskId)
        if (res.status === 'ok' && res.data) {
          const data = res.data as TaskMessage[]
          setMessages(data)
          setMessagesCursor(res.meta?.nextCursor ?? null)
        }
      }
    }
    const start = () => {
      if (timer) { clearInterval(timer); timer = null }
      const interval = active === 'chat' ? 5_000 : 30_000
      timer = setInterval(fetchNow, interval)
    }
    fetchNow()
    start()
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') {
        if (timer) { clearInterval(timer); timer = null }
      } else {
        fetchNow()
        start()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      if (timer) clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [active, lastOrgId, selectedTeamId, selectedListId, selectedTaskId])

  // Desktop panel body renderer
  const renderPanelBody = (panelKey: Panel) => {
    if (panelKey === 'teams') {
      return (
        <div className="mt-2 flex-1 flex flex-col min-h-0 text-sm">
          <div className="flex-1 min-h-0 overflow-auto space-y-1">
            {loadingTeams ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Spinner /> <span>Loading…</span></div>
            ) : teams.length === 0 ? (
              <EmptyState title="No teams" description="Create a team to get started." />
            ) : (
              <ul className="divide-y">
                {teams.slice().sort((a, b) => a.name.localeCompare(b.name)).map((t) => (
                  <li key={t.id} className="group">
                    <div className={`flex items-center justify-between py-1 px-1 rounded ${selectedTeamId === t.id ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                      <button className="text-left hover:underline flex-1" onClick={() => handleTeamSelect(t.id)} aria-current={selectedTeamId === t.id ? 'true' : undefined}>
                        {t.name}
                      </button>
                      <button
                        className="ml-2 px-2 py-1 text-xs rounded border opacity-0 group-hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); openEdit('team', t) }}
                        title="Edit team"
                        aria-label="Edit team"
                      >⚙️</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button
                className="text-xs underline disabled:opacity-50"
                disabled={teamsPageIndex === 0}
                onClick={() => {
                  if (teamsPageIndex > 0) {
                    const newIndex = teamsPageIndex - 1
                    setTeams(teamsPages[newIndex])
                    setTeamsPageIndex(newIndex)
                  }
                }}
              >Prev</button>
              <button
                className="text-xs underline disabled:opacity-50"
                disabled={!teamsCursor}
                onClick={async () => {
                  if (!lastOrgId || !teamsCursor) return
                  const res = await listTeams(lastOrgId, 20, teamsCursor)
                  if (res.status === 'ok' && res.data) {
                    setTeams(res.data)
                    setTeamsPages((prev) => [...prev, res.data as Team[]])
                    setTeamsPageIndex((prev) => prev + 1)
                    setTeamsCursor(res.meta?.nextCursor ?? null)
                  }
                }}
              >Next</button>
            </div>
          </div>
          <div className="shrink-0 border-t px-2 py-2">
            {!showAddTeam ? (
              <div className="flex">
                <button className="w-full px-3 py-2 text-sm rounded border disabled:opacity-50" onClick={() => setShowAddTeam(true)}>Add Team</button>
              </div>
            ) : (
              <div className="space-y-2">
                {createError && <ErrorAlert message={createError} />}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label="New team"
                      placeholder="Team name"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') { e.preventDefault(); setShowAddTeam(false) }
                        if (e.key === 'Enter') { e.preventDefault(); doCreateTeam() }
                      }}
                    />
                  </div>
                  <button
                    className="px-3 py-2 text-sm rounded bg-primary text-primary-foreground disabled:opacity-50"
                    disabled={creatingTeam || !lastOrgId || newTeamName.trim().length < 2}
                    onClick={doCreateTeam}
                  >{creatingTeam ? 'Creating…' : 'Create'}</button>
                  <button className="px-2 py-2 text-sm rounded border" onClick={() => setShowAddTeam(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }
    if (panelKey === 'lists') {
      return (
        <div className="mt-2 flex-1 flex flex-col min-h-0 text-sm">
          <div className="flex-1 min-h-0 overflow-auto space-y-1">
            {!selectedTeamId ? (
              <EmptyState title="Select a team" description="Choose a team to view its lists." />
            ) : loadingLists ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Spinner /> <span>Loading…</span></div>
            ) : lists.length === 0 ? (
              <EmptyState title="No lists" description="Select a team or create a list." />
            ) : (
              <ul className="divide-y">
                {lists.slice().sort((a, b) => a.name.localeCompare(b.name)).map((l) => (
                  <li key={l.id} className="group">
                    <div className={`flex items-center justify-between py-1 px-1 rounded ${selectedListId === l.id ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                      <button className="text-left hover:underline flex-1" onClick={() => handleListSelect(l.id)} aria-current={selectedListId === l.id ? 'true' : undefined}>
                        {l.name}
                      </button>
                      <button
                        className="ml-2 px-2 py-1 text-xs rounded border opacity-0 group-hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); openEdit('list', l) }}
                        title="Edit list"
                        aria-label="Edit list"
                      >⚙️</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button
                className="text-xs underline disabled:opacity-50"
                disabled={listsPageIndex === 0}
                onClick={() => {
                  if (listsPageIndex > 0) {
                    const newIndex = listsPageIndex - 1
                    setLists(listsPages[newIndex])
                    setListsPageIndex(newIndex)
                  }
                }}
              >Prev</button>
              <button
                className="text-xs underline disabled:opacity-50"
                disabled={!listsCursor || !selectedTeamId}
                onClick={async () => {
                  if (!selectedTeamId || !listsCursor) return
                  const res = await listLists(selectedTeamId, 20, listsCursor)
                  if (res.status === 'ok' && res.data) {
                    setLists(res.data)
                    setListsPages((prev) => [...prev, res.data as TaskList[]])
                    setListsPageIndex((prev) => prev + 1)
                    setListsCursor(res.meta?.nextCursor ?? null)
                  }
                }}
              >Next</button>
            </div>
          </div>
          <div className="shrink-0 border-t px-2 py-2">
            {!showAddList ? (
              <div className="flex">
                <button className="w-full px-3 py-2 text-sm rounded border disabled:opacity-50" onClick={() => setShowAddList(true)}>Add List</button>
              </div>
            ) : (
              <div className="space-y-2">
                {createError && <ErrorAlert message={createError} />}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label="New list"
                      placeholder="List name"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') { e.preventDefault(); setShowAddList(false) }
                        if (e.key === 'Enter') { e.preventDefault(); doCreateList() }
                      }}
                    />
                  </div>
                  <button
                    className="px-3 py-2 text-sm rounded bg-primary text-primary-foreground disabled:opacity-50"
                    disabled={creatingList || newListName.trim().length < 2}
                    onClick={doCreateList}
                  >{creatingList ? 'Creating…' : 'Create'}</button>
                  <button className="px-2 py-2 text-sm rounded border" onClick={() => setShowAddList(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }
    if (panelKey === 'tasks') {
      return (
        <div className="mt-2 flex-1 flex flex-col min-h-0 text-sm">
          <div className="flex-1 min-h-0 overflow-auto space-y-1">
            {loadingTasks ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Spinner /> <span>Loading…</span></div>
            ) : tasks.length === 0 ? (
              <EmptyState title="No tasks" description="Select a list or create a task." />
            ) : (
              <ul className="divide-y">
                {tasks.slice().sort((a, b) => a.title.localeCompare(b.title)).map((tk) => (
                  <li key={tk.id} className="group">
                    <div className={`flex items-center justify-between py-1 px-1 rounded ${taskStatusClasses(tk.status, selectedTaskId === tk.id)}`}>
                      <button className="text-left hover:underline flex-1" onClick={() => handleTaskSelect(tk.id)} aria-current={selectedTaskId === tk.id ? 'true' : undefined}>
                        {tk.title}
                      </button>
                      <button
                        className="ml-2 px-2 py-1 text-xs rounded border opacity-0 group-hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); openEdit('task', tk) }}
                        title="Edit task"
                        aria-label="Edit task"
                      >⚙️</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button
                className="text-xs underline disabled:opacity-50"
                disabled={tasksPageIndex === 0}
                onClick={() => {
                  if (tasksPageIndex > 0) {
                    const newIndex = tasksPageIndex - 1
                    setTasks(tasksPages[newIndex])
                    setTasksPageIndex(newIndex)
                  }
                }}
              >Prev</button>
              <button
                className="text-xs underline disabled:opacity-50"
                disabled={!tasksCursor}
                onClick={async () => {
                  if (!selectedListId || !tasksCursor) return
                  const res = await listTasks(selectedListId, 20, tasksCursor)
                  if (res.status === 'ok' && res.data) {
                    setTasks(res.data)
                    setTasksPages((prev) => [...prev, res.data as Task[]])
                    setTasksPageIndex((prev) => prev + 1)
                    setTasksCursor(res.meta?.nextCursor ?? null)
                  }
                }}
              >Next</button>
            </div>
          </div>
          <div className="shrink-0 border-t px-2 py-2">
            {!showAddTask ? (
              <div className="flex">
                <button className="w-full px-3 py-2 text-sm rounded border disabled:opacity-50" onClick={() => setShowAddTask(true)}>Add Task</button>
              </div>
            ) : (
              <div className="space-y-2">
                {createError && <ErrorAlert message={createError} />}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label="New task"
                      placeholder="Task title"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') { e.preventDefault(); setShowAddTask(false) }
                        if (e.key === 'Enter') { e.preventDefault(); doCreateTask() }
                      }}
                    />
                  </div>
                  <button
                    className="px-3 py-2 text-sm rounded bg-primary text-primary-foreground disabled:opacity-50"
                    disabled={creatingTask || newTaskTitle.trim().length < 2}
                    onClick={doCreateTask}
                  >{creatingTask ? 'Creating…' : 'Create'}</button>
                  <button className="px-2 py-2 text-sm rounded border" onClick={() => setShowAddTask(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }
    // chat
    return (
      <div className="mt-2 flex-1 flex flex-col min-h-0 text-sm">
        <div className="flex-1 min-h-0 overflow-auto space-y-1">
          {loadingMessages ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Spinner /> <span>Loading…</span></div>
          ) : messages.length === 0 ? (
            <EmptyState title="No messages" description="Send a message to start the conversation." />
          ) : (
            <div id="chat-scroll-container" className="space-y-2 pr-2">
              {messages.map((m) => {
                const mine = currentUserId && m.authorId === currentUserId
                return (
                  <div key={m.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                    {!mine && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium select-none"
                        style={{ backgroundColor: colorFromId(m.authorId) }}
                        title={m.authorId}
                      >
                        {initialsFromId(m.authorId)}
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow border ${mine ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                      style={{
                        backgroundColor: mine ? '#DCF8C6' : '#FFFFFF',
                        color: '#111827',
                        borderColor: '#e5e7eb',
                      }}
                    >
                      <div>{m.body}</div>
                      <div className="mt-1 text-[10px] text-gray-500 text-right">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )}
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <button
              className="text-xs underline disabled:opacity-50"
              disabled={messagesPageIndex === 0}
              onClick={() => {
                if (messagesPageIndex > 0) {
                  const newIndex = messagesPageIndex - 1
                  setMessages(messagesPages[newIndex])
                  setMessagesPageIndex(newIndex)
                }
              }}
            >Prev</button>
            <button
              className="text-xs underline disabled:opacity-50"
              disabled={!messagesCursor}
              onClick={async () => {
                if (!selectedTaskId || !messagesCursor) return
                const res = await listMessages(selectedTaskId, 20, messagesCursor)
                if (res.status === 'ok' && res.data) {
                  setMessages(res.data)
                  setMessagesPages((prev) => [...prev, res.data as TaskMessage[]])
                  setMessagesPageIndex((prev) => prev + 1)
                  setMessagesCursor(res.meta?.nextCursor ?? null)
                }
              }}
            >Next</button>
          </div>
        </div>
        <div className="shrink-0 border-t px-2 py-2">
          {chatError && <ErrorAlert message={chatError} />}
          <div className="flex items-end gap-2">
            <button title="Voice note" aria-label="Record voice note" className="px-2 py-2 rounded border text-xs" disabled>🎤</button>
            <button title="Attach photo or document" aria-label="Attach photo or document" className="px-2 py-2 rounded border text-xs" disabled>📎</button>
            <div className="flex-1">
              <textarea
                className="w-full border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                rows={1}
                placeholder="Type a message…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (e.ctrlKey || e.shiftKey) {
                      return
                    }
                    e.preventDefault()
                    doSendMessage()
                  }
                }}
              />
            </div>
            <button
              className="px-3 py-2 text-sm rounded bg-primary text-primary-foreground disabled:opacity-50"
              disabled={sendingMessage || !selectedTaskId || chatInput.trim().length === 0}
              onClick={doSendMessage}
            >{sendingMessage ? 'Sending…' : 'Send'}</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="h-16 px-6 flex items-center justify-between border-b">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <div className="flex items-center gap-4">
          <div className="text-sm">Org: <span className="font-medium">{orgName ?? '—'}</span> · <button className="underline" onClick={onChangeOrg}>Change</button></div>
          <button
            className="px-2 py-1 rounded border text-sm"
            title="Settings"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
          >⚙️</button>
        </div>
      </div>

      <div className="flex-1 relative">
        {/* Mobile view: single active card (hidden when carousel enabled) */}
        <div className={`absolute inset-0 w-full max-w-5xl mx-auto px-2 sm:hidden overflow-hidden ${useCarousel ? 'hidden' : ''}`}>
          <div className="relative w-full h-full">
            {panels.map((p, idx) => {
              const isActive = p.key === active
              const offset = idx - activeIndex
              return (
                <div
                  key={p.key}
                  onClick={!isActive ? () => setActive(p.key) : undefined}
                  className={
                    'transition-all duration-300 rounded-xl border bg-card text-card-foreground shadow touch-manipulation absolute ' +
                    (isActive
                      ? 'z-20 inset-y-0 left-1/2 w-[92%] sm:w-[65%] h-full p-4 sm:p-6 mx-auto flex flex-col'
                      : offset === -1
                        ? 'hidden sm:block z-10 top-1/2 left-[3%] w-[40%] sm:w-[28%] h-[55%] p-3 backdrop-blur-sm opacity-70'
                        : offset === 1
                          ? 'hidden sm:block z-10 top-1/2 right-[3%] w-[40%] sm:w-[28%] h-[55%] p-3 backdrop-blur-sm opacity-70'
                          : 'hidden')
                  }
                  style={{
                    transform: isActive ? 'translateX(-50%)' : 'translateY(-50%)',
                    filter: isActive ? 'none' : 'blur(2px)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-semibold">{p.title}</h3>
                    {!isActive && <span className="hidden sm:block text-xs text-muted-foreground">tap to focus</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{p.desc}</p>
                  {isActive && (
                    <div className="mt-2 flex-1 flex flex-col min-h-0 text-sm">
                      <div className="flex justify-end mb-2">
                        <button className="text-xs underline opacity-70" disabled>Filter</button>
                      </div>
                      {p.key === 'teams' && (
                        <>
                          <div className="flex-1 min-h-0 overflow-auto space-y-1">
                            {loadingTeams ? (
                              <div className="flex items-center gap-2 text-muted-foreground"><Spinner /> <span>Loading…</span></div>
                            ) : teams.length === 0 ? (
                              <EmptyState title="No teams" description="Create a team to get started." />
                            ) : (
                              <ul className="divide-y">
                                {teams.slice().sort((a, b) => a.name.localeCompare(b.name)).map((t) => (
                                  <li key={t.id} className="group">
                                    <div className={`flex items-center justify-between py-1 px-1 rounded ${selectedTeamId === t.id ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                                      <button className="text-left hover:underline flex-1" onClick={() => handleTeamSelect(t.id)} aria-current={selectedTeamId === t.id ? 'true' : undefined}>
                                        {t.name}
                                      </button>
                                      <button
                                        className="ml-2 px-2 py-1 text-xs rounded border opacity-0 group-hover:opacity-100"
                                        onClick={(e) => { e.stopPropagation(); openEdit('team', t) }}
                                        title="Edit team"
                                        aria-label="Edit team"
                                      >⚙️</button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                            <div className="flex justify-end gap-2 mt-2">
                              <button
                                className="text-xs underline disabled:opacity-50"
                                disabled={teamsPageIndex === 0}
                                onClick={() => {
                                  if (teamsPageIndex > 0) {
                                    const newIndex = teamsPageIndex - 1
                                    setTeams(teamsPages[newIndex])
                                    setTeamsPageIndex(newIndex)
                                  }
                                }}
                              >Prev</button>
                              <button
                                className="text-xs underline disabled:opacity-50"
                                disabled={!teamsCursor}
                                onClick={async () => {
                                  if (!lastOrgId || !teamsCursor) return
                                  const res = await listTeams(lastOrgId, 20, teamsCursor)
                                  if (res.status === 'ok' && res.data) {
                                    setTeams(res.data)
                                    setTeamsPages((prev) => [...prev, res.data as Team[]])
                                    setTeamsPageIndex((prev) => prev + 1)
                                    setTeamsCursor(res.meta?.nextCursor ?? null)
                                  }
                                }}
                              >Next</button>
                            </div>
                          </div>
                          <div className="shrink-0 border-t px-2 py-2">
                            {!showAddTeam ? (
                              <div className="flex">
                                <button className="w-full px-3 py-2 text-sm rounded border disabled:opacity-50" onClick={() => setShowAddTeam(true)}>Add Team</button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {createError && <ErrorAlert message={createError} />}
                                <div className="flex items-end gap-2">
                                  <div className="flex-1">
                                    <Input
                                      label="New team"
                                      placeholder="Team name"
                                      value={newTeamName}
                                      onChange={(e) => setNewTeamName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Escape') { e.preventDefault(); setShowAddTeam(false) }
                                        if (e.key === 'Enter') { e.preventDefault(); doCreateTeam() }
                                      }}
                                    />
                                  </div>
                                  <button
                                    className="px-3 py-2 text-sm rounded bg-primary text-primary-foreground disabled:opacity-50"
                                    disabled={creatingTeam || !lastOrgId || newTeamName.trim().length < 2}
                                    onClick={doCreateTeam}
                                  >{creatingTeam ? 'Creating…' : 'Create'}</button>
                                  <button className="px-2 py-2 text-sm rounded border" onClick={() => setShowAddTeam(false)}>Cancel</button>
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      {p.key === 'lists' && (
                        <>
                          {!selectedTeamId ? (
                            <EmptyState title="Select a team" description="Choose a team to view its lists." />
                          ) : loadingLists ? (
                            <div className="flex items-center gap-2 text-muted-foreground"><Spinner /> <span>Loading…</span></div>
                          ) : lists.length === 0 ? (
                            <EmptyState title="No lists" description="Select a team or create a list." />
                          ) : (
                            <>
                              <div className="flex-1 min-h-0 overflow-auto space-y-1">
                                <ul className="divide-y">
                                  {lists.slice().sort((a, b) => a.name.localeCompare(b.name)).map((l) => (
                                    <li key={l.id} className="group">
                                      <div className={`flex items-center justify-between py-1 px-1 rounded ${selectedListId === l.id ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                                        <button className="text-left hover:underline flex-1" onClick={() => handleListSelect(l.id)} aria-current={selectedListId === l.id ? 'true' : undefined}>
                                          {l.name}
                                        </button>
                                        <button
                                          className="ml-2 px-2 py-1 text-xs rounded border opacity-0 group-hover:opacity-100"
                                          onClick={(e) => { e.stopPropagation(); openEdit('list', l) }}
                                          title="Edit list"
                                          aria-label="Edit list"
                                        >⚙️</button>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                                <div className="flex justify-end gap-2 mt-2">
                                  <button
                                    className="text-xs underline disabled:opacity-50"
                                    disabled={listsPageIndex === 0}
                                    onClick={() => {
                                      if (listsPageIndex > 0) {
                                        const newIndex = listsPageIndex - 1
                                        setLists(listsPages[newIndex])
                                        setListsPageIndex(newIndex)
                                      }
                                    }}
                                  >Prev</button>
                                  <button
                                    className="text-xs underline disabled:opacity-50"
                                    disabled={!listsCursor || !selectedTeamId}
                                    onClick={async () => {
                                      if (!selectedTeamId || !listsCursor) return
                                      const res = await listLists(selectedTeamId, 20, listsCursor)
                                      if (res.status === 'ok' && res.data) {
                                        setLists(res.data)
                                        setListsPages((prev) => [...prev, res.data as TaskList[]])
                                        setListsPageIndex((prev) => prev + 1)
                                        setListsCursor(res.meta?.nextCursor ?? null)
                                      }
                                    }}
                                  >Next</button>
                                </div>
                              </div>
                              <div className="shrink-0 border-t px-2 py-2">
                            {!showAddList ? (
                              <div className="flex">
                                <button className="w-full px-3 py-2 text-sm rounded border disabled:opacity-50" onClick={() => setShowAddList(true)}>Add List</button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {createError && <ErrorAlert message={createError} />}
                                <div className="flex items-end gap-2">
                                  <div className="flex-1">
                                    <Input
                                      label="New list"
                                      placeholder="List name"
                                      value={newListName}
                                      onChange={(e) => setNewListName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Escape') { e.preventDefault(); setShowAddList(false) }
                                        if (e.key === 'Enter') { e.preventDefault(); doCreateList() }
                                      }}
                                    />
                                  </div>
                                  <button
                                    className="px-3 py-2 text-sm rounded bg-primary text-primary-foreground disabled:opacity-50"
                                    disabled={creatingList || newListName.trim().length < 2}
                                    onClick={doCreateList}
                                  >{creatingList ? 'Creating…' : 'Create'}</button>
                                  <button className="px-2 py-2 text-sm rounded border" onClick={() => setShowAddList(false)}>Cancel</button>
                                </div>
                              </div>
                            )}
                              </div>
                            </>
                          )}
                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              className="text-xs underline disabled:opacity-50"
                              disabled={listsPageIndex === 0}
                              onClick={() => {
                                if (listsPageIndex > 0) {
                                  const newIndex = listsPageIndex - 1
                                  setLists(listsPages[newIndex])
                                  setListsPageIndex(newIndex)
                                }
                              }}
                            >Prev</button>
                            <button
                              className="text-xs underline disabled:opacity-50"
                              disabled={!listsCursor || !selectedTeamId}
                              onClick={async () => {
                                if (!selectedTeamId || !listsCursor) return
                                const res = await listLists(selectedTeamId, 20, listsCursor)
                                if (res.status === 'ok' && res.data) {
                                  setLists(res.data)
                                  setListsPages((prev) => [...prev, res.data as TaskList[]])
                                  setListsPageIndex((prev) => prev + 1)
                                  setListsCursor(res.meta?.nextCursor ?? null)
                                }
                              }}
                            >Next</button>
                          </div>
                        </>
                      )}
                      {p.key === 'tasks' && (
                        <>
                          {loadingTasks ? (
                            <div className="flex items-center gap-2 text-muted-foreground"><Spinner /> <span>Loading…</span></div>
                          ) : tasks.length === 0 ? (
                            <EmptyState title="No tasks" description="Select a list or create a task." />
                          ) : (
                            <>
                              <div className="flex-1 min-h-0 overflow-auto space-y-1">
                                <ul className="divide-y">
                                  {tasks.slice().sort((a, b) => a.title.localeCompare(b.title)).map((tk) => (
                                    <li key={tk.id} className="group">
                                      <div className={`flex items-center justify-between py-1 px-1 rounded ${taskStatusClasses(tk.status, selectedTaskId === tk.id)}`}>
                                        <button className="text-left hover:underline flex-1" onClick={() => handleTaskSelect(tk.id)} aria-current={selectedTaskId === tk.id ? 'true' : undefined}>
                                          {tk.title}
                                        </button>
                                        <button
                                          className="ml-2 px-2 py-1 text-xs rounded border opacity-0 group-hover:opacity-100"
                                          onClick={(e) => { e.stopPropagation(); openEdit('task', tk) }}
                                          title="Edit task"
                                          aria-label="Edit task"
                                        >⚙️</button>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                                <div className="flex justify-end gap-2 mt-2">
                                  <button
                                    className="text-xs underline disabled:opacity-50"
                                    disabled={tasksPageIndex === 0}
                                    onClick={() => {
                                      if (tasksPageIndex > 0) {
                                        const newIndex = tasksPageIndex - 1
                                        setTasks(tasksPages[newIndex])
                                        setTasksPageIndex(newIndex)
                                      }
                                    }}
                                  >Prev</button>
                                  <button
                                    className="text-xs underline disabled:opacity-50"
                                    disabled={!tasksCursor}
                                    onClick={async () => {
                                      if (!selectedListId || !tasksCursor) return
                                      const res = await listTasks(selectedListId, 20, tasksCursor)
                                      if (res.status === 'ok' && res.data) {
                                        setTasks(res.data)
                                        setTasksPages((prev) => [...prev, res.data as Task[]])
                                        setTasksPageIndex((prev) => prev + 1)
                                        setTasksCursor(res.meta?.nextCursor ?? null)
                                      }
                                    }}
                                  >Next</button>
                                </div>
                              </div>
                              <div className="shrink-0 border-t px-2 py-2">
                            {!showAddTask ? (
                              <div className="flex">
                                <button className="w-full px-3 py-2 text-sm rounded border disabled:opacity-50" onClick={() => setShowAddTask(true)}>Add Task</button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {createError && <ErrorAlert message={createError} />}
                                <div className="flex items-end gap-2">
                                  <div className="flex-1">
                                    <Input
                                      label="New task"
                                      placeholder="Task title"
                                      value={newTaskTitle}
                                      onChange={(e) => setNewTaskTitle(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Escape') { e.preventDefault(); setShowAddTask(false) }
                                        if (e.key === 'Enter') { e.preventDefault(); doCreateTask() }
                                      }}
                                    />
                                  </div>
                                  <button
                                    className="px-3 py-2 text-sm rounded bg-primary text-primary-foreground disabled:opacity-50"
                                    disabled={creatingTask || newTaskTitle.trim().length < 2}
                                    onClick={doCreateTask}
                                  >{creatingTask ? 'Creating…' : 'Create'}</button>
                                  <button className="px-2 py-2 text-sm rounded border" onClick={() => setShowAddTask(false)}>Cancel</button>
                                </div>
                              </div>
                            )}
                              </div>
                            </>
                          )}
                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              className="text-xs underline disabled:opacity-50"
                              disabled={tasksPageIndex === 0}
                              onClick={() => {
                                if (tasksPageIndex > 0) {
                                  const newIndex = tasksPageIndex - 1
                                  setTasks(tasksPages[newIndex])
                                  setTasksPageIndex(newIndex)
                                }
                              }}
                            >Prev</button>
                            <button
                              className="text-xs underline disabled:opacity-50"
                              disabled={!tasksCursor}
                              onClick={async () => {
                                if (!selectedListId || !tasksCursor) return
                                const res = await listTasks(selectedListId, 20, tasksCursor)
                                if (res.status === 'ok' && res.data) {
                                  setTasks(res.data)
                                  setTasksPages((prev) => [...prev, res.data as Task[]])
                                  setTasksPageIndex((prev) => prev + 1)
                                  setTasksCursor(res.meta?.nextCursor ?? null)
                                }
                              }}
                            >Next</button>
                          </div>
                        </>
                      )}
                      {p.key === 'chat' && (
                        <>
                          <div className="flex-1 min-h-0 overflow-auto space-y-1">
                            {loadingMessages ? (
                              <div className="flex items-center gap-2 text-muted-foreground"><Spinner /> <span>Loading…</span></div>
                            ) : messages.length === 0 ? (
                              <EmptyState title="No messages" description="Send a message to start the conversation." />
                            ) : (
                              <div id="chat-scroll-container" className="space-y-2 pr-2">
                                {messages.map((m) => {
                                  const mine = currentUserId && m.authorId === currentUserId
                                  return (
                                    <div key={m.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                                      {!mine && (
                                        <div
                                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium select-none"
                                          style={{ backgroundColor: colorFromId(m.authorId) }}
                                          title={m.authorId}
                                        >
                                          {initialsFromId(m.authorId)}
                                        </div>
                                      )}
                                      <div
                                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow border ${mine ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                                        style={{
                                          backgroundColor: mine ? '#DCF8C6' : '#FFFFFF',
                                          color: '#111827',
                                          borderColor: '#e5e7eb',
                                        }}
                                      >
                                        <div>{m.body}</div>
                                        <div className="mt-1 text-[10px] text-gray-500 text-right">
                                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                            <div className="flex justify-end gap-2 mt-2">
                              <button
                                className="text-xs underline disabled:opacity-50"
                                disabled={messagesPageIndex === 0}
                                onClick={() => {
                                  if (messagesPageIndex > 0) {
                                    const newIndex = messagesPageIndex - 1
                                    setMessages(messagesPages[newIndex])
                                    setMessagesPageIndex(newIndex)
                                  }
                                }}
                              >Prev</button>
                              <button
                                className="text-xs underline disabled:opacity-50"
                                disabled={!messagesCursor}
                                onClick={async () => {
                                  if (!selectedTaskId || !messagesCursor) return
                                  const res = await listMessages(selectedTaskId, 20, messagesCursor)
                                  if (res.status === 'ok' && res.data) {
                                    setMessages(res.data)
                                    setMessagesPages((prev) => [...prev, res.data as TaskMessage[]])
                                    setMessagesPageIndex((prev) => prev + 1)
                                    setMessagesCursor(res.meta?.nextCursor ?? null)
                                  }
                                }}
                              >Next</button>
                            </div>
                          </div>
                          <div className="shrink-0 border-t px-2 py-2">
                            {chatError && <ErrorAlert message={chatError} />}
                            <div className="flex items-end gap-2">
                              <button
                                title="Voice note"
                                aria-label="Record voice note"
                                className="px-2 py-2 rounded border text-xs"
                                disabled
                              >🎤</button>
                              <button
                                title="Attach photo or document"
                                aria-label="Attach photo or document"
                                className="px-2 py-2 rounded border text-xs"
                                disabled
                              >📎</button>
                              <div className="flex-1">
                                <textarea
                                  className="w-full border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                                  rows={1}
                                  placeholder="Type a message…"
                                  value={chatInput}
                                  onChange={(e) => setChatInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      if (e.ctrlKey || e.shiftKey) {
                                        return
                                      }
                                      e.preventDefault()
                                      doSendMessage()
                                    }
                                  }}
                                />
                              </div>
                              <button
                                className="px-3 py-2 text-sm rounded bg-primary text-primary-foreground disabled:opacity-50"
                                disabled={sendingMessage || !selectedTaskId || chatInput.trim().length === 0}
                                onClick={doSendMessage}
                              >{sendingMessage ? 'Sending…' : 'Send'}</button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Mobile view: horizontal snap-scrolling carousel (enabled via flag) */}
        <div className={`absolute inset-0 w-full max-w-5xl mx-auto sm:hidden ${useCarousel ? '' : 'hidden'}`}>
          <div
            ref={mobileScrollRef}
            className="h-full w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory flex scroll-smooth"
          >
            {visiblePanels.map((p) => (
              <div key={p.key} className="min-w-full shrink-0 snap-start snap-always px-2">
                <div className={`h-full rounded-xl border bg-card text-card-foreground shadow flex flex-col p-3 ${p.key === active ? 'ring-2 ring-primary shadow-lg' : ''}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">{p.title}</h3>
                    <span className="text-xs text-muted-foreground">{p.desc}</span>
                  </div>
                  {renderPanelBody(p.key)}
                </div>
              </div>
            ))}
          </div>
          {/* Fixed bottom left/right navigation buttons */}
          <div className="pointer-events-none fixed left-0 right-0 bottom-4 flex justify-center gap-4">
            <button
              className="pointer-events-auto px-3 py-2 rounded-full border bg-background shadow disabled:opacity-50"
              onClick={goPrev}
              disabled={activeIndex === 0}
              aria-label="Previous panel"
              title="Previous"
            >◀</button>
            <button
              className="pointer-events-auto px-3 py-2 rounded-full border bg-background shadow disabled:opacity-50"
              onClick={goNext}
              disabled={activeIndex === visiblePanels.length - 1}
              aria-label="Next panel"
              title="Next"
            >▶</button>
          </div>
        </div>

        {/* Desktop view: all cards side-by-side */}
        <div className="hidden sm:flex absolute inset-0 w-full max-w-7xl mx-auto px-2 gap-2 items-stretch">
          {visiblePanels.map((p) => {
            const nonChatCount = visiblePanels.filter(v => v.key !== 'chat').length
            const basisPercent = p.key === 'chat' ? Math.max(20, 100 - nonChatCount * 20) : 20
            return (
              <div
                key={p.key}
                className={
                  `flex-none h-full rounded-xl border bg-card text-card-foreground shadow flex flex-col p-3 transition`
                }
                style={{ flexBasis: `${basisPercent}%` }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{p.title}</h3>
                  <div className="flex items-center gap-2">
                    <button className="text-xs underline opacity-70" disabled>Filter</button>
                    <button className="text-xs underline" onClick={() => setActive(p.key)}>focus</button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
                {renderPanelBody(p.key)}
              </div>
            )
          })}
        </div>

        {/* Settings Modal */}
        {settingsOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSettingsOpen(false)} />
            <div className="relative z-[121] w-[90%] max-w-md rounded-lg border bg-card text-card-foreground shadow-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-base font-semibold">Settings</h4>
                <button className="text-sm underline" onClick={() => setSettingsOpen(false)}>Close</button>
              </div>
              {settingsError && <ErrorAlert message={settingsError} />}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-sm">Remove Teams</div>
                    <div className="text-xs text-muted-foreground">Hide Teams card. Requires exactly one team in the org.</div>
                  </div>
                  <div>
                    <label className={`inline-flex items-center gap-2 ${!canManageSettings ? 'opacity-60 cursor-not-allowed' : ''}`}
                      title={!canManageSettings ? 'Only admins and owners can change this setting' : undefined}>
                      <input type="checkbox" className="h-4 w-4" checked={hideTeams} onChange={onToggleHideTeams} disabled={!canManageSettings} />
                      <span className="text-xs">{hideTeams ? 'On' : 'Off'}</span>
                    </label>
                  </div>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-sm">Remove Task Lists</div>
                    <div className="text-xs text-muted-foreground">Hide Lists card. Requires each team to have exactly one list.</div>
                  </div>
                  <div>
                    <label className={`inline-flex items-center gap-2 ${!canManageSettings ? 'opacity-60 cursor-not-allowed' : ''}`}
                      title={!canManageSettings ? 'Only admins and owners can change this setting' : undefined}>
                      <input type="checkbox" className="h-4 w-4" checked={hideLists} onChange={onToggleHideLists} disabled={!canManageSettings} />
                      <span className="text-xs">{hideLists ? 'On' : 'Off'}</span>
                    </label>
                  </div>
                </div>
                {!canManageSettings && (
                  <div className="text-xs text-muted-foreground">Only admins and owners can change these settings.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={closeEdit} />
            <div className="relative z-[101] w-[90%] max-w-md rounded-lg border bg-card text-card-foreground shadow-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-base font-semibold">{editTarget.type === 'task' ? 'Edit Task' : editTarget.type === 'list' ? 'List Details' : 'Team Details'}</h4>
                <button className="text-sm underline" onClick={closeEdit}>Close</button>
              </div>
              {editError && <ErrorAlert message={editError} />}
              {editTarget.type === 'task' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs mb-1">Title</label>
                    <input className="w-full border rounded px-2 py-1 text-sm" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Description</label>
                    <textarea className="w-full border rounded px-2 py-1 text-sm resize-y" rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Status</label>
                    <select className="w-full border rounded px-2 py-1 text-sm" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                      <option value="REQUIRES_ATTENTION">REQUIRES_ATTENTION</option>
                      <option value="AT_RISK">AT_RISK</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="COMPLETE">COMPLETE</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
                    <div className="flex items-center gap-2">
                      <button className="px-2 py-1 text-xs rounded border" onClick={doArchive} disabled={actionBusy}>Archive</button>
                      <button className="px-2 py-1 text-xs rounded border border-red-500 text-red-600" onClick={doDelete} disabled={actionBusy}>Delete</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-2 text-sm rounded border" onClick={closeEdit}>Cancel</button>
                      <button className="px-3 py-2 text-sm rounded bg-primary text-primary-foreground disabled:opacity-50" disabled={savingEdit || editTitle.trim().length < 1} onClick={saveEdit}>{savingEdit ? 'Saving…' : 'Save'}</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs mb-1">Name</label>
                    <input className="w-full border rounded px-2 py-1 text-sm" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  </div>
                  <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
                    <div className="flex items-center gap-2">
                      <button className="px-2 py-1 text-xs rounded border" onClick={doArchive} disabled={actionBusy || !canManageSettings} title={!canManageSettings ? 'Admins/Owners only' : undefined}>Archive</button>
                      <button className="px-2 py-1 text-xs rounded border border-red-500 text-red-600" onClick={doDelete} disabled={actionBusy || !canManageSettings} title={!canManageSettings ? 'Admins/Owners only' : undefined}>Delete</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-2 text-sm rounded border" onClick={closeEdit}>Cancel</button>
                      <button className="px-3 py-2 text-sm rounded bg-primary text-primary-foreground disabled:opacity-50" disabled={savingEdit || editTitle.trim().length < 2} onClick={saveEdit}>{savingEdit ? 'Saving…' : 'Save'}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
