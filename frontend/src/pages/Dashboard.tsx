import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { listTeams, createTeam, type Team } from '@/api/teams'
import { listLists, createList, type TaskList } from '@/api/lists'
import { listTasks, createTask, type Task } from '@/api/tasks'
import { Input } from '@/components/ui/input'
import { ErrorAlert } from '@/components/ui/alert'
import { listMessages, sendMessage, type TaskMessage } from '@/api/messages'
import { getMe } from '@/api/users'

type Panel = 'teams' | 'lists' | 'tasks' | 'chat'

const panels: { key: Panel; title: string; desc: string }[] = [
  { key: 'teams', title: 'Teams', desc: 'Manage teams in the org' },
  { key: 'lists', title: 'Task Lists', desc: 'Lists within a team' },
  { key: 'tasks', title: 'Tasks', desc: 'Work items and statuses' },
  { key: 'chat', title: 'Chat', desc: 'Messages for the selected task' },
]

export default function Dashboard() {
  const lastOrgId = localStorage.getItem('lastOrgId')
  const [active, setActive] = useState<Panel>('teams')
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
  const messagesEndRef = (typeof document !== 'undefined') ? (document.createElement('div')) : null

  function colorFromId(id: string) {
    let hash = 0
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
    const hue = Math.abs(hash) % 360
    return `hsl(${hue} 70% 75%)`
  }
  function initialsFromId(id: string) {
    return id.slice(0, 2).toUpperCase()
  }

  useEffect(() => {
    (async () => {
      if (!lastOrgId) return
      setLoadingTeams(true)
      const res = await listTeams(lastOrgId)
      if (res.status === 'ok' && res.data) {
        setTeams(res.data)
        setTeamsPages([res.data])
        setTeamsPageIndex(0)
        setTeamsCursor(res.meta?.nextCursor ?? null)
      }
      setLoadingTeams(false)
    })()
  }, [lastOrgId])

  useEffect(() => {
    (async () => {
      if (!selectedTeamId) return
      setLoadingLists(true)
      const res = await listLists(selectedTeamId)
      if (res.status === 'ok' && res.data) {
        setLists(res.data)
        setListsPages([res.data])
        setListsPageIndex(0)
        setListsCursor(res.meta?.nextCursor ?? null)
      }
      setLoadingLists(false)
    })()
  }, [selectedTeamId])

  // When team changes, clear dependent selections and data to ensure scoping
  useEffect(() => {
    setSelectedListId(null)
    setSelectedTaskId(null)
    setLists([])
    setTasks([])
    setMessages([])
  }, [selectedTeamId])

  useEffect(() => {
    (async () => {
      if (!selectedListId) return
      setLoadingTasks(true)
      const res = await listTasks(selectedListId)
      if (res.status === 'ok' && res.data) {
        setTasks(res.data)
        setTasksPages([res.data])
        setTasksPageIndex(0)
        setTasksCursor(res.meta?.nextCursor ?? null)
      }
      setLoadingTasks(false)
    })()
  }, [selectedListId])

  useEffect(() => {
    (async () => {
      if (!selectedTaskId) return
      setLoadingMessages(true)
      const res = await listMessages(selectedTaskId)
      if (res.status === 'ok' && res.data) {
        setMessages(res.data)
        setMessagesPages([res.data])
        setMessagesPageIndex(0)
        setMessagesCursor(res.meta?.nextCursor ?? null)
      }
      setLoadingMessages(false)
    })()
  }, [selectedTaskId])

  // Load current user for bubble alignment
  useEffect(() => {
    (async () => {
      const me = await getMe()
      if (me.status === 'ok' && me.data?.id) setCurrentUserId(me.data.id)
    })()
  }, [])

  // Auto-scroll to latest on messages change
  useEffect(() => {
    const el = document.getElementById('chat-scroll-container')
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // Ensure the active panel advances when a selection is made
  useEffect(() => {
    if (selectedTeamId) setActive('lists')
  }, [selectedTeamId])
  useEffect(() => {
    if (selectedListId) setActive('tasks')
  }, [selectedListId])
  useEffect(() => {
    if (selectedTaskId) setActive('chat')
  }, [selectedTaskId])

  // Polling: teams/lists/tasks every 30s when their panel is active; chat every 5s when active.
  useEffect(() => {
    let timer: any = null
    const isVisible = () => typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
    const setup = () => {
      if (!isVisible()) return
      if (active === 'teams' && lastOrgId) {
        timer = setInterval(async () => {
          const res = await listTeams(lastOrgId)
          if (res.status === 'ok' && res.data) {
            setTeams(res.data)
            setTeamsCursor(res.meta?.nextCursor ?? null)
          }
        }, 30_000)
      } else if (active === 'lists' && selectedTeamId) {
        timer = setInterval(async () => {
          const res = await listLists(selectedTeamId)
          if (res.status === 'ok' && res.data) {
            setLists(res.data)
            setListsCursor(res.meta?.nextCursor ?? null)
          }
        }, 30_000)
      } else if (active === 'tasks' && selectedListId) {
        timer = setInterval(async () => {
          const res = await listTasks(selectedListId)
          if (res.status === 'ok' && res.data) {
            setTasks(res.data)
            setTasksCursor(res.meta?.nextCursor ?? null)
          }
        }, 30_000)
      } else if (active === 'chat' && selectedTaskId) {
        timer = setInterval(async () => {
          const res = await listMessages(selectedTaskId)
          if (res.status === 'ok' && res.data) {
            setMessages(res.data)
            setMessagesCursor(res.meta?.nextCursor ?? null)
          }
        }, 5_000)
      }
    }
    const onVisibility = () => {
      if (!isVisible()) {
        if (timer) clearInterval(timer)
        timer = null
      } else {
        if (!timer) setup()
      }
    }
    setup()
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility)
    return () => {
      if (timer) clearInterval(timer)
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [active, lastOrgId, selectedTeamId, selectedListId, selectedTaskId])

  return (
    <div className="p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <div className="text-sm">Org: <span className="font-mono">{lastOrgId ?? '—'}</span> · <Link className="underline" to="/org">Change</Link></div>
      </div>

      <div className="relative sm:h-[60vh] flex items-stretch sm:items-center justify-center">
        <div className="relative w-full max-w-5xl px-2 sm:px-0">
          <div className="flex items-start sm:items-center justify-center gap-3 sm:gap-6">
            {panels.map((p) => {
              const isActive = p.key === active
              return (
                <button
                  key={p.key}
                  onClick={() => setActive(p.key)}
                  className={
                    'transition-all duration-300 rounded-xl border bg-card text-card-foreground shadow touch-manipulation ' +
                    (isActive
                      ? 'z-20 w-full sm:w-[48%] sm:scale-105 p-4 sm:p-6'
                      : 'hidden sm:block z-10 sm:w-[18%] sm:scale-90 p-3 backdrop-blur-sm opacity-70')
                  }
                  style={{
                    filter: isActive ? 'none' : 'blur(1px)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-semibold">{p.title}</h3>
                    {!isActive && <span className="hidden sm:block text-xs text-muted-foreground">tap to focus</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
                  {isActive && (
                    <div className="mt-4 max-h-[50vh] sm:h-48 overflow-auto text-sm space-y-2">
                      {p.key === 'teams' && (
                        <>
                          {loadingTeams ? (
                            <div className="flex items-center gap-2 text-muted-foreground"><Spinner /> <span>Loading…</span></div>
                          ) : teams.length === 0 ? (
                            <EmptyState title="No teams" description="Create a team to get started." />
                          ) : (
                            <ul className="space-y-1">
                              {teams.map((t) => (
                                <li key={t.id}>
                                  <button className="w-full text-left hover:underline py-2" onClick={() => { setSelectedTeamId(t.id); setActive('lists') }}>
                                    {t.name}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="mt-3 space-y-2">
                            {createError && <ErrorAlert message={createError} />}
                            <div className="flex items-end gap-2">
                              <div className="flex-1">
                                <Input label="New team" placeholder="Team name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
                              </div>
                              <button
                                className="px-3 py-2 text-sm rounded bg-primary text-primary-foreground disabled:opacity-50"
                                disabled={creatingTeam || !lastOrgId || newTeamName.trim().length < 2}
                                onClick={async () => {
                                  if (!lastOrgId) return
                                  setCreateError(null)
                                  setCreatingTeam(true)
                                  const res = await createTeam(lastOrgId, { name: newTeamName.trim() })
                                  setCreatingTeam(false)
                                  if (res.status === 'ok' && res.data) {
                                    setNewTeamName('')
                                    const refreshed = await listTeams(lastOrgId)
                                    if (refreshed.status === 'ok' && refreshed.data) {
                                      setTeams(refreshed.data)
                                    }
                                  } else {
                                    setCreateError(res.message ?? 'Unknown error')
                                  }
                                }}
                              >{creatingTeam ? 'Creating…' : 'Create'}</button>
                            </div>
                          </div>
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
                            <ul className="space-y-1">
                              {lists.map((l) => (
                                <li key={l.id}>
                                  <button className="w-full text-left hover:underline py-2" onClick={() => { setSelectedListId(l.id); setActive('tasks') }}>
                                    {l.name}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="mt-3 space-y-2">
                            {createError && <ErrorAlert message={createError} />}
                            <div className="flex items-end gap-2">
                              <div className="flex-1">
                                <Input label="New list" placeholder="List name" value={newListName} onChange={(e) => setNewListName(e.target.value)} />
                              </div>
                              <button
                                className="px-3 py-2 text-sm rounded bg-primary text-primary-foreground disabled:opacity-50"
                                disabled={creatingList || !selectedTeamId || newListName.trim().length < 2}
                                onClick={async () => {
                                  if (!selectedTeamId) return
                                  setCreateError(null)
                                  setCreatingList(true)
                                  const res = await createList(selectedTeamId, { name: newListName.trim() })
                                  setCreatingList(false)
                                  if (res.status === 'ok' && res.data) {
                                    setNewListName('')
                                    const refreshed = await listLists(selectedTeamId)
                                    if (refreshed.status === 'ok' && refreshed.data) {
                                      setLists(refreshed.data)
                                    }
                                  } else {
                                    setCreateError(res.message ?? 'Unknown error')
                                  }
                                }}
                              >{creatingList ? 'Creating…' : 'Create'}</button>
                            </div>
                          </div>
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
                            <ul className="space-y-1">
                              {tasks.map((tk) => (
                                <li key={tk.id}>
                                  <button className="w-full text-left hover:underline py-2" onClick={() => { setSelectedTaskId(tk.id); setActive('chat') }}>
                                    {tk.title} — <span className="uppercase text-xs">{tk.status}</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="mt-3 space-y-2">
                            {createError && <ErrorAlert message={createError} />}
                            <div className="flex items-end gap-2">
                              <div className="flex-1">
                                <Input label="New task" placeholder="Task title" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
                              </div>
                              <button
                                className="px-3 py-2 text-sm rounded bg-primary text-primary-foreground disabled:opacity-50"
                                disabled={creatingTask || !selectedListId || newTaskTitle.trim().length < 2}
                                onClick={async () => {
                                  if (!selectedListId) return
                                  setCreateError(null)
                                  setCreatingTask(true)
                                  const res = await createTask(selectedListId, { title: newTaskTitle.trim() })
                                  setCreatingTask(false)
                                  if (res.status === 'ok' && res.data) {
                                    setNewTaskTitle('')
                                    const refreshed = await listTasks(selectedListId)
                                    if (refreshed.status === 'ok' && refreshed.data) {
                                      setTasks(refreshed.data)
                                    }
                                  } else {
                                    setCreateError(res.message ?? 'Unknown error')
                                  }
                                }}
                              >{creatingTask ? 'Creating…' : 'Create'}</button>
                            </div>
                          </div>
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
                          {loadingMessages ? (
                            <div className="flex items-center gap-2 text-muted-foreground"><Spinner /> <span>Loading…</span></div>
                          ) : messages.length === 0 ? (
                            <EmptyState title="No messages" description="Send a message to start the conversation." />
                          ) : (
                            <div id="chat-scroll-container" className="space-y-2 max-h-64 overflow-y-auto pr-2">
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
                          <div className="mt-3 space-y-2">
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
                                <Input placeholder="Type a message…" value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
                              </div>
                              <button
                                className="px-3 py-2 text-sm rounded bg-primary text-primary-foreground disabled:opacity-50"
                                disabled={sendingMessage || !selectedTaskId || chatInput.trim().length === 0}
                                onClick={async () => {
                                  if (!selectedTaskId) return
                                  setChatError(null)
                                  setSendingMessage(true)
                                  const res = await sendMessage(selectedTaskId, chatInput)
                                  setSendingMessage(false)
                                  if (res.status === 'ok' && res.data) {
                                    setChatInput('')
                                    // Optimistically append, then refresh
                                    setMessages((prev) => [...prev, res.data as TaskMessage])
                                    const refreshed = await listMessages(selectedTaskId)
                                    if (refreshed.status === 'ok' && refreshed.data) {
                                      setMessages(refreshed.data)
                                    }
                                  } else {
                                    setChatError(res.message ?? 'Failed to send message')
                                  }
                                }}
                              >{sendingMessage ? 'Sending…' : 'Send'}</button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
