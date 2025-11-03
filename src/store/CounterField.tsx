import { create } from 'zustand'

interface StoreState {
  key: number
  increaseKey: () => void
}

const useStore = create<StoreState>((set) => ({
  key: 0,
  increaseKey: () =>
    set((state) => ({ key: state.key + 1 })),
}))

export default useStore
