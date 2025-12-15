import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listTeams, type Team } from '@/api/teams'
import { listLists, type TaskList } from '@/api/lists'
import { listTasks, type Task } from '@/api/tasks'
import { listMessages, type TaskMessage } from '@/api/messages'

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

  useEffect(() => {
    (async () => {
      if (!lastOrgId) return
      const res = await listTeams(lastOrgId)
      if (res.status === 'ok' && res.data) {
        setTeams(res.data)
        setTeamsPages([res.data])
        setTeamsPageIndex(0)
        setTeamsCursor(res.meta?.nextCursor ?? null)
      }
    })()
  }, [lastOrgId])

  useEffect(() => {
    (async () => {
      if (!selectedTeamId) return
      const res = await listLists(selectedTeamId)
      if (res.status === 'ok' && res.data) {
        setLists(res.data)
        setListsPages([res.data])
        setListsPageIndex(0)
        setListsCursor(res.meta?.nextCursor ?? null)
      }
    })()
  }, [selectedTeamId])

  useEffect(() => {
    (async () => {
      if (!selectedListId) return
      const res = await listTasks(selectedListId)
      if (res.status === 'ok' && res.data) {
        setTasks(res.data)
        setTasksPages([res.data])
        setTasksPageIndex(0)
        setTasksCursor(res.meta?.nextCursor ?? null)
      }
    })()
  }, [selectedListId])

  useEffect(() => {
    (async () => {
      if (!selectedTaskId) return
      const res = await listMessages(selectedTaskId)
      if (res.status === 'ok' && res.data) {
        setMessages(res.data)
        setMessagesPages([res.data])
        setMessagesPageIndex(0)
        setMessagesCursor(res.meta?.nextCursor ?? null)
      }
    })()
  }, [selectedTaskId])

  return (
    <div className="p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <div className="text-sm">Org: <span className="font-mono">{lastOrgId ?? '—'}</span> · <Link className="underline" to="/org">Change</Link></div>
      </div>

      <div className="relative h-[60vh] flex items-center justify-center">
        <div className="relative w-full max-w-5xl">
          <div className="flex items-center justify-center gap-6">
            {panels.map((p) => {
              const isActive = p.key === active
              return (
                <button
                  key={p.key}
                  onClick={() => setActive(p.key)}
                  className={
                    'transition-all duration-300 rounded-xl border bg-card text-card-foreground shadow ' +
                    (isActive
                      ? 'z-20 w-[48%] scale-105 p-6'
                      : 'z-10 w-[18%] scale-90 p-3 backdrop-blur-sm opacity-70')
                  }
                  style={{
                    filter: isActive ? 'none' : 'blur(1px)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{p.title}</h3>
                    {!isActive && <span className="text-xs text-muted-foreground">tap to focus</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
                  {isActive && (
                    <div className="mt-4 h-48 overflow-auto text-sm space-y-2">
                      {p.key === 'teams' && (
                        <>
                          <ul className="space-y-1">
                            {teams.map((t) => (
                              <li key={t.id}>
                                <button className="w-full text-left hover:underline" onClick={() => { setSelectedTeamId(t.id); setActive('lists') }}>
                                  {t.name}
                                </button>
                              </li>
                            ))}
                          </ul>
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
                          <ul className="space-y-1">
                            {lists.map((l) => (
                              <li key={l.id}>
                                <button className="w-full text-left hover:underline" onClick={() => { setSelectedListId(l.id); setActive('tasks') }}>
                                  {l.name}
                                </button>
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
                              disabled={!listsCursor}
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
                          <ul className="space-y-1">
                            {tasks.map((tk) => (
                              <li key={tk.id}>
                                <button className="w-full text-left hover:underline" onClick={() => { setSelectedTaskId(tk.id); setActive('chat') }}>
                                  {tk.title} — <span className="uppercase text-xs">{tk.status}</span>
                                </button>
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
                        </>
                      )}
                      {p.key === 'chat' && (
                        <>
                          <ul className="space-y-1">
                            {messages.map((m) => (
                              <li key={m.id}>
                                <div className="text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</div>
                                <div>{m.body}</div>
                              </li>
                            ))}
                          </ul>
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
