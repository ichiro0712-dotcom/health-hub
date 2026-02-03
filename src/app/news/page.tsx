'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Newspaper, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { NewsItem } from '@/types/news';
import { getNews } from '@/lib/mock-data';
import { formatRelativeTime } from '@/lib/utils';
import { NewsCardSkeleton } from '@/components/ui/Skeleton';

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  general: { label: 'お知らせ', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  health: { label: '健康', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' },
  feature: { label: '新機能', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400' },
  update: { label: 'アップデート', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' },
};

const PER_PAGE = 20;

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    setIsLoading(true);

    // APIコールをシミュレート
    const timer = setTimeout(() => {
      const data = getNews(currentPage, PER_PAGE);
      setNews(data.news);
      setTotalPages(Math.ceil(data.total / PER_PAGE));
      setHasMore(data.hasMore);
      setIsLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500/10 dark:bg-teal-400/10">
                <Newspaper className="w-5 h-5 text-teal-500 dark:text-teal-400" />
              </div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                ニュース一覧
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          {/* News List */}
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {isLoading ? (
              // Skeleton loading
              [...Array(10)].map((_, i) => <NewsCardSkeleton key={i} />)
            ) : (
              news.map((item) => <NewsListItem key={item.id} news={item} />)
            )}
          </div>

          {/* Pagination */}
          {!isLoading && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  ページ {currentPage} / {totalPages}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {generatePageNumbers(currentPage, totalPages).map((page, i) =>
                      page === '...' ? (
                        <span
                          key={`ellipsis-${i}`}
                          className="px-2 text-slate-400"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page as number)}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-teal-500 text-white'
                              : 'hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!hasMore}
                    className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NewsListItem({ news }: { news: NewsItem }) {
  const category = CATEGORY_LABELS[news.category];

  return (
    <Link
      href={`/news/${news.id}`}
      className="block p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
    >
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Category & Date */}
        <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 sm:w-28 flex-shrink-0">
          <span
            className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${category.color}`}
          >
            {category.label}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {formatRelativeTime(news.publishedAt)}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
            {news.title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {news.excerpt}
          </p>
        </div>

        {/* Arrow */}
        <div className="hidden sm:flex items-center flex-shrink-0">
          <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-teal-500 dark:group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  );
}

// ページ番号配列を生成するヘルパー関数
function generatePageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | string)[] = [];

  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '...', total);
  } else if (current >= total - 3) {
    pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }

  return pages;
}
