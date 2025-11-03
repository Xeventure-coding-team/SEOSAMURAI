import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface GMBState {
  accessToken: string | null
  refreshToken: string | null
  tokenExpiry: Date | null
  accountName: string | null
  accountId: string | null
  isActive: boolean
}

interface GMBActions {
  setAccessToken: (token: string | null) => void
  setRefreshToken: (token: string | null) => void
  setTokenExpiry: (expiry: Date | null) => void
  setAccountName: (name: string | null) => void
  setAccountId: (id: string | null) => void
  setIsActive: (active: boolean) => void
  clearTokens: () => void
  initializeFromDB: (data: Partial<GMBState>) => void
}

type GMBStore = GMBState & GMBActions

export const useGMBStore = create<GMBStore>()(
  persist(
    (set) => ({
      // State
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null,
      accountName: null,
      accountId: null,
      isActive: false,

      // Actions
      setAccessToken: (token) => set({ accessToken: token }),
      setRefreshToken: (token) => set({ refreshToken: token }),
      setTokenExpiry: (expiry) => set({ tokenExpiry: expiry }),
      setAccountName: (name) => set({ accountName: name }),
      setAccountId: (id) => set({ accountId: id }),
      setIsActive: (active) => set({ isActive: active }),

      clearTokens: () => set({
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
        accountName: null,
        accountId: null,
        isActive: false,
      }),

      initializeFromDB: (data) => set((state) => ({
        ...state,
        ...data,
        tokenExpiry: data.tokenExpiry ? new Date(data.tokenExpiry) : null,
      })),
    }),
    {
      name: 'gmb-storage',
      storage: createJSONStorage(() => sessionStorage), // Using sessionStorage for temporary caching
      // Only persist non-sensitive data for better performance
      partialize: (state) => ({
        accountName: state.accountName,
        accountId: state.accountId,
        isActive: state.isActive,
      }),
    }
  )
)