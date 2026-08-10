import { create } from 'zustand';
import type { DetailContent } from '../../types/detail';

interface DetailState {
  content?: DetailContent;
  setContent: (content: DetailContent) => void;
  clear: () => void;
}

export const useDetailStore = create<DetailState>((set) => ({
  content: undefined,
  setContent: (content) => set({ content }),
  clear: () => set({ content: undefined }),
}));
