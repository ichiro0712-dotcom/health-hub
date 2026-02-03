'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, CloudSun, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

interface HeroSectionProps {
  userName: string;
}

export function HeroSection({ userName }: HeroSectionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState({ text: '', icon: Sun });
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    let greetingText = '';
    let icon = Sun;

    if (hour >= 5 && hour < 12) {
      greetingText = 'おはようございます';
      icon = Sun;
    } else if (hour >= 12 && hour < 17) {
      greetingText = 'こんにちは';
      icon = CloudSun;
    } else {
      greetingText = 'こんばんは';
      icon = Moon;
    }

    setGreeting({ text: greetingText, icon });

    // 日付フォーマット
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    };
    setCurrentDate(now.toLocaleDateString('ja-JP', options));

    // ローディング解除
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const Icon = greeting.icon;

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-600 p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-2xl bg-white/20" />
              <Skeleton className="h-8 w-64 bg-white/20 rounded-lg" />
            </div>
            <Skeleton className="h-5 w-48 bg-white/20 rounded-lg" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-12 w-32 bg-white/20 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 via-teal-500 to-emerald-600 p-6 md:p-8 shadow-xl shadow-teal-500/20">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Floating sparkles decoration */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6">
        <Sparkles className="w-6 h-6 text-white/30 animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Greeting */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {greeting.text}、{userName}さん
              </h1>
            </div>
          </div>
          <p className="text-white/80 text-sm md:text-base pl-[60px] md:pl-[60px]">
            {currentDate}
          </p>
        </div>

        {/* Motivation Text */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/20">
          <p className="text-white/90 text-sm font-medium">
            今日も健康的な一日を過ごしましょう
          </p>
        </div>
      </div>
    </div>
  );
}
