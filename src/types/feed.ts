export interface FeedAuthor {
  name: string;
  avatar: string;
  link?: string;
}

export interface FeedMedia {
  type: 'image' | 'video';
  url: string;
  alt?: string;
}

export interface FeedStats {
  likes: number;
  comments: number;
}

export interface FeedSource {
  id: string;
  name: string;
  homeUrl: string;
  likeLabel: string;
  commentLabel: string;
}

export interface FeedItem {
  id: string;
  platform: string;
  originalUrl: string;
  author: FeedAuthor;
  createdAt?: string | number;
  title?: string;
  contentHtml: string;
  media?: FeedMedia[];
  stats: FeedStats;
  rawElementRef?: Element;
}

export type FeedAction = 'like' | 'comment';
