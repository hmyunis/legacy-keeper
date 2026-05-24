import { create } from 'zustand';

export type SearchStatus = 'IDLE' | 'PROCESSING' | 'READY' | 'FAILED' | 'CANCELLED';

export interface SearchSession {
  query: string;
  deep: boolean;
  status: SearchStatus;
  taskId: string | null;
  progress: number;
  stage: string | null;
  error: string | null;
  results: any[];
  updatedAt: string | null;
}

export const createEmptySearchSession = (): SearchSession => ({
  query: '',
  deep: false,
  status: 'IDLE',
  taskId: null,
  progress: 0,
  stage: null,
  error: null,
  results: [],
  updatedAt: null,
});

interface SearchState {
  session: SearchSession;
  setSession: (session: SearchSession) => void;
  patchSession: (patch: Partial<SearchSession>) => void;
  resetSession: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  session: createEmptySearchSession(),
  setSession: (session) => set({ session }),
  patchSession: (patch) =>
    set((state) => ({
      session: {
        ...state.session,
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    })),
  resetSession: () => set({ session: createEmptySearchSession() }),
}));
