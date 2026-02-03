export interface VideoItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: string;
  category: string;
  publishedAt: string;
  viewCount: number;
}

export interface VideoResponse {
  success: boolean;
  data?: {
    videos: VideoItem[];
    total: number;
    hasMore: boolean;
  };
  error?: string;
}

export const VIDEO_CATEGORIES = [
  { value: 'all', label: 'すべて' },
  { value: 'exercise', label: 'エクササイズ' },
  { value: 'nutrition', label: '栄養・食事' },
  { value: 'mental', label: 'メンタルヘルス' },
  { value: 'sleep', label: '睡眠' },
  { value: 'meditation', label: '瞑想・リラックス' },
] as const;
