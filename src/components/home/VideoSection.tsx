'use client';

import { useState, useEffect, useCallback } from 'react';
import { Play, Search, Filter, ChevronDown, Video, Loader2, Eye } from 'lucide-react';
import { VideoItem, VIDEO_CATEGORIES } from '@/types/video';
import { getVideos } from '@/lib/mock-data';
import { formatRelativeTime, formatViewCount } from '@/lib/utils';
import { VideoCardSkeleton } from '@/components/ui/Skeleton';

export function VideoSection() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const loadVideos = useCallback(
    async (reset: boolean = false) => {
      const offset = reset ? 0 : videos.length;
      if (reset) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      // APIコールをシミュレート
      await new Promise((resolve) => setTimeout(resolve, 600));

      const data = getVideos(
        offset,
        10,
        selectedCategory,
        searchQuery
      );

      if (reset) {
        setVideos(data.videos);
      } else {
        setVideos((prev) => [...prev, ...data.videos]);
      }

      setHasMore(data.hasMore);
      setIsLoading(false);
      setIsLoadingMore(false);
    },
    [selectedCategory, searchQuery, videos.length]
  );

  // 初回ロードとフィルター変更時
  useEffect(() => {
    loadVideos(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setShowCategoryDropdown(false);
  };

  const selectedCategoryLabel =
    VIDEO_CATEGORIES.find((c) => c.value === selectedCategory)?.label || 'すべて';

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-700/50">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/10 dark:bg-rose-400/10">
                <Video className="w-5 h-5 text-rose-500 dark:text-rose-400" />
              </div>
              <span className="text-lg">動画コンテンツ</span>
            </h2>
          </div>

          {/* Search & Filter */}
          <div className="flex gap-3">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="動画を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm"
              />
            </form>

            {/* Category Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">{selectedCategoryLabel}</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showCategoryDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowCategoryDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-700 rounded-xl shadow-lg border border-slate-100 dark:border-slate-600 py-2 z-20">
                    {VIDEO_CATEGORIES.map((category) => (
                      <button
                        key={category.value}
                        onClick={() => handleCategoryChange(category.value)}
                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors ${
                          selectedCategory === category.value
                            ? 'text-teal-600 dark:text-teal-400 font-medium bg-teal-50 dark:bg-teal-900/30'
                            : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="p-5">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12">
            <Video className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">
              該当する動画が見つかりませんでした
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => loadVideos(false)}
                  disabled={isLoadingMore}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium transition-colors disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>読み込み中...</span>
                    </>
                  ) : (
                    <span>もっと見る</span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function VideoCard({ video }: { video: VideoItem }) {
  return (
    <div className="group cursor-pointer">
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Play Button Overlay */}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-white/90 dark:bg-slate-800/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 text-rose-500 ml-1" fill="currentColor" />
          </div>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/70 text-white text-xs font-medium">
          {video.duration}
        </div>

        {/* Category Badge */}
        <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-rose-500/90 text-white text-xs font-medium">
          {VIDEO_CATEGORIES.find((c) => c.value === video.category)?.label || video.category}
        </div>
      </div>

      {/* Info */}
      <div className="mt-3">
        <h3 className="font-medium text-slate-800 dark:text-slate-100 line-clamp-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors leading-snug">
          {video.title}
        </h3>
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {formatViewCount(video.viewCount)}回視聴
          </span>
          <span>{formatRelativeTime(video.publishedAt)}</span>
        </div>
      </div>
    </div>
  );
}
