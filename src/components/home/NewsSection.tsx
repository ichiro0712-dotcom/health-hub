'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Newspaper, ArrowRight, ChevronRight } from 'lucide-react';
import { NewsItem } from '@/types/news';
import { getNews } from '@/lib/mock-data';
import { formatRelativeTime, formatShortDate } from '@/lib/utils';
import { NewsCardSkeleton } from '@/components/ui/Skeleton';

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  general: { label: 'お知らせ', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  health: { label: '健康', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' },
  feature: { label: '新機能', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400' },
  update: { label: 'アップデート', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' },
};

export function NewsSection() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 実際のAPIコールをシミュレート
    const timer = setTimeout(() => {
      const data = getNews(1, 5);
      setNews(data.news);
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-700/50">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 dark:bg-teal-400/10">
              <Newspaper className="w-5 h-5 text-teal-500 dark:text-teal-400" />
            </div>
            <span className="text-lg">最新ニュース</span>
          </h2>
          <Link
            href="/news"
            className="flex items-center gap-1.5 text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors group"
          >
            <span>もっと見る</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {isLoading ? (
          // Skeleton loading
          <>
            <NewsCardSkeleton />
            <NewsCardSkeleton />
            <NewsCardSkeleton />
            <NewsCardSkeleton />
            <NewsCardSkeleton />
          </>
        ) : (
          news.map((item) => (
            <NewsCard key={item.id} news={item} />
          ))
        )}
      </div>

      {/* Footer */}
      <Link
        href="/news"
        className="flex items-center justify-center gap-2 p-4 bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors border-t border-slate-100 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300"
      >
        <span>ニュース一覧を見る</span>
        <ChevronRight className="w-4 h-4" />
      </Link>
    </section>
  );
}

function NewsCard({ news }: { news: NewsItem }) {
  const category = CATEGORY_LABELS[news.category];

  return (
    <Link
      href={`/news/${news.id}`}
      className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
    >
      <div className="flex items-start gap-3">
        {/* Content - left aligned */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {formatShortDate(news.publishedAt)}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {category.label}
            </span>
          </div>
          <h3 className="font-medium text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
            {news.title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mt-1">
            {news.excerpt}
          </p>
        </div>

        {/* Arrow indicator */}
        <div className="flex-shrink-0 flex items-center pt-1">
          <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-teal-500 dark:group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  );
}
