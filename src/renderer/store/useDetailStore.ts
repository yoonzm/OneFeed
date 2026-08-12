import { create } from 'zustand';
import type { DetailContent } from '../../types/detail';

interface DetailState {
  content?: DetailContent;
  setContent: (content: DetailContent) => void;
  clear: () => void;
}

/**
 * Detail Adapter 每次提交一份完整快照，因此这里直接替换，不进行深层合并。
 * 文章与 Thread 共享该 Store，但仍通过 DetailContent 联合类型保持结构边界。
 */
export const useDetailStore = create<DetailState>((set) => ({
  content: undefined,
  setContent: (content) => set({ content }),
  clear: () => set({ content: undefined }),
}));
