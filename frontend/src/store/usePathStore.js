import { create } from 'zustand'

const usePathStore = create((set) => ({
  path: null,
  nodes: [],
  adaptations: [],
  loading: false,

  setPath: (path) => {
    const allNodes = []
    if (path?.milestones) {
      for (const m of path.milestones) {
        for (const n of m.nodes) {
          allNodes.push({ ...n, milestoneTitle: m.title })
        }
      }
    }
    set({ path, nodes: allNodes })
  },

  updateNodeStatus: (nodeId, status) => set((state) => ({
    nodes: state.nodes.map(n =>
      n.node_id === nodeId ? { ...n, status } : n
    ),
    path: state.path ? {
      ...state.path,
      milestones: state.path.milestones.map(m => ({
        ...m,
        nodes: m.nodes.map(n =>
          n.node_id === nodeId ? { ...n, status } : n
        ),
      })),
    } : state.path,
  })),

  addAdaptation: (event) => set((state) => ({
    adaptations: [event, ...state.adaptations].slice(0, 20),
  })),

  setLoading: (loading) => set({ loading }),
}))

export default usePathStore
