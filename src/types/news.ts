export interface NewsItem {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  publishedAt: string;
  category: 'general' | 'health' | 'feature' | 'update';
  imageUrl?: string;
}

export interface NewsResponse {
  success: boolean;
  data?: {
    news: NewsItem[];
    total: number;
    page: number;
    perPage: number;
    hasMore: boolean;
  };
  error?: string;
}
