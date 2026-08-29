import { create } from 'zustand'
import api from '../services/api'

/**
 * Multi-role goals store.
 *
 * Tracks the user's active learning paths (roles) and which one is current.
 * The RoleSwitcher in the shell activates paths; pages subscribe to
 * `activePathId` and re-fetch their data when it changes.
 */
const useGoalsStore = create((set, get) => ({
  goals: [],
  activePathId: '',
  status: 'idle', // idle | loading | error

  setActivePathId: (pathId) => set({ activePathId: pathId }),

  fetchGoals: async () => {
    set({ status: 'loading' })
    try {
      const res = await api.getGoals()
      set({
        goals: res.goals || [],
        activePathId: res.active_path_id || '',
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
      set({ activePathId: nextActive })
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

  isMaxed: () => get().goals.filter((g) => g.status === 'active').length >= 2,
}))

export default useGoalsStore