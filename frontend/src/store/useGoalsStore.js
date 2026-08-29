import { create } from 'zustand'
import api from '../services/api'

/**
 * Multi-role goals store.
 *
 * Tracks the user's active learning paths (roles) and which one is current.
 * The RoleSwitcher in the shell activates paths; pages subscribe to
 * `activePathId` and re-fetch their data when it changes.
 *
 * Users may hold an unlimited number of independent learning paths. The only
 * hard rule is that at least one path must exist.
 */
const ACTIVE_PATH_KEY = 'pf_active_path_id'

const useGoalsStore = create((set, get) => ({
  goals: [],
  activePathId: '',
  status: 'idle', // idle | loading | error

  setActivePathId: (pathId) => {
    if (pathId) localStorage.setItem(ACTIVE_PATH_KEY, pathId)
    set({ activePathId: pathId })
  },

  fetchGoals: async () => {
    set({ status: 'loading' })
    try {
      const res = await api.getGoals()
      const serverActive = res.active_path_id || ''
      const local = localStorage.getItem(ACTIVE_PATH_KEY)
      const goals = res.goals || []
      const hasLocal = goals.some((g) => g.path_id === local)
      set({
        goals,
        activePathId: serverActive || (hasLocal ? local : '') || '',
        status: 'idle',
      })
      return res
    } catch {
      set({ status: 'error' })
      return null
    }
  },

  activate: async (pathId) => {
    try {
      const res = await api.activateGoal(pathId)
      const nextActive = res.active_path_id || pathId
      get().setActivePathId(nextActive)
      await get().fetchGoals()
      return { ok: true, activePathId: nextActive }
    } catch {
      return { ok: false }
    }
  },

  createGoal: async (data) => {
    const res = await api.createGoal(data)
    await get().fetchGoals()
    return res
  },

  deletePath: async (pathId) => {
    const res = await api.deletePath(pathId)
    const nextActive = res.active_path_id || ''
    if (localStorage.getItem(ACTIVE_PATH_KEY) === pathId) {
      localStorage.removeItem(ACTIVE_PATH_KEY)
    }
    set({ goals: res.goals || [], activePathId: nextActive })
    if (nextActive) get().setActivePathId(nextActive)
    return res
  },
}))

export default useGoalsStore