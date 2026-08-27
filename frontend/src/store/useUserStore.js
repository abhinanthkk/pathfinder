import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useUserStore = create(
  persist(
    (set, get) => ({
      userId: null,
      profile: null,
      skills: {},
      recommendations: [],

      setUserId: (id) => set({ userId: id }),

      setProfile: (profile) => set({
        profile,
        skills: profile?.user_skills || {},
      }),

      updateSkill: (skillId, confidence) => set((state) => ({
        skills: { ...state.skills, [skillId]: confidence },
      })),

      setRecommendations: (recs) => set({ recommendations: recs }),

      getGaps: () => {
        const { profile } = get()
        return profile?.skill_gaps || {}
      },
    }),
    {
      name: 'pathfinder-user',
      partialize: (state) => ({ userId: state.userId, profile: state.profile }),
    }
  )
)

export default useUserStore
