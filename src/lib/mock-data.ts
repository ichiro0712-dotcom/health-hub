import { NewsItem } from '@/types/news';
import { VideoItem } from '@/types/video';

// ダミーニュースデータ
export const MOCK_NEWS: NewsItem[] = [
  {
    id: '1',
    title: '新機能リリース：AIヘルスアドバイザーが進化しました',
    content: 'AIヘルスアドバイザーが最新のGPT-4oモデルに対応し、より精度の高い健康アドバイスを提供できるようになりました。睡眠パターン分析、運動習慣の最適化、食事バランスの改善提案など、パーソナライズされたアドバイスをお楽しみください。',
    excerpt: 'AIヘルスアドバイザーが最新のGPT-4oモデルに対応し、より精度の高い健康アドバイスを提供できるようになりました。',
    publishedAt: new Date().toISOString(),
    category: 'feature',
  },
  {
    id: '2',
    title: 'Google Fit連携のアップデートについて',
    content: 'Google Fitとの連携機能が強化され、心拍数の変動、血中酸素濃度、ストレスレベルなどの詳細データも同期可能になりました。より包括的な健康管理をサポートします。',
    excerpt: 'Google Fitとの連携機能が強化され、心拍数の変動、血中酸素濃度、ストレスレベルなどの詳細データも同期可能になりました。',
    publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'update',
  },
  {
    id: '3',
    title: '春の健康キャンペーン開催中',
    content: '4月限定で、健康目標達成者には特別バッジをプレゼント！毎日の歩数目標を達成して、限定アチーブメントをゲットしましょう。友達を招待すると、さらに特典がもらえます。',
    excerpt: '4月限定で、健康目標達成者には特別バッジをプレゼント！毎日の歩数目標を達成して、限定アチーブメントをゲットしましょう。',
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'general',
  },
  {
    id: '4',
    title: '睡眠の質を高める5つのヒント',
    content: '質の良い睡眠は健康の基盤です。就寝前のスマホ使用を控える、寝室の温度を適切に保つ、規則正しい就寝時間を守るなど、今日から始められる改善策をご紹介します。',
    excerpt: '質の良い睡眠は健康の基盤です。就寝前のスマホ使用を控える、寝室の温度を適切に保つなど、改善策をご紹介。',
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'health',
  },
  {
    id: '5',
    title: 'メンテナンスのお知らせ',
    content: '2月10日（月）午前2時〜5時の間、システムメンテナンスを実施いたします。この間、一部の機能がご利用いただけません。ご不便をおかけしますが、ご理解のほどよろしくお願いいたします。',
    excerpt: '2月10日（月）午前2時〜5時の間、システムメンテナンスを実施いたします。',
    publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'update',
  },
  {
    id: '6',
    title: '運動習慣がメンタルヘルスに与える効果',
    content: '最新の研究によると、週3回以上の有酸素運動がストレス軽減と気分改善に効果的であることが示されています。ウォーキングやジョギングなど、手軽に始められる運動から取り組んでみましょう。',
    excerpt: '最新の研究によると、週3回以上の有酸素運動がストレス軽減と気分改善に効果的であることが示されています。',
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'health',
  },
  {
    id: '7',
    title: 'DNA分析機能のベータ版公開',
    content: 'パーソナライズされた健康アドバイスの精度をさらに高めるため、DNA分析機能のベータ版を公開しました。遺伝的な傾向を考慮した、あなただけの健康プランを作成します。',
    excerpt: 'パーソナライズされた健康アドバイスの精度をさらに高めるため、DNA分析機能のベータ版を公開しました。',
    publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'feature',
  },
  {
    id: '8',
    title: 'ユーザーの声：Health Hubで変わった生活習慣',
    content: '実際にHealth Hubを利用しているユーザーさんの体験談をご紹介。3ヶ月で体重5kg減、睡眠の質が改善、ストレスが軽減したなど、多くの成功事例が寄せられています。',
    excerpt: '実際にHealth Hubを利用しているユーザーさんの体験談をご紹介。多くの成功事例が寄せられています。',
    publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'general',
  },
  {
    id: '9',
    title: '栄養バランスチェック機能を追加',
    content: '食事記録から自動で栄養バランスを分析し、不足している栄養素や過剰摂取の傾向をお知らせします。バランスの取れた食生活をサポートする新機能をお試しください。',
    excerpt: '食事記録から自動で栄養バランスを分析し、不足している栄養素や過剰摂取の傾向をお知らせします。',
    publishedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'feature',
  },
  {
    id: '10',
    title: '水分補給の重要性と適切な摂取量',
    content: '1日に必要な水分量は体重や活動量によって異なります。適切な水分補給は代謝促進、肌の健康維持、疲労回復に効果的。あなたに最適な水分摂取量を計算してみましょう。',
    excerpt: '1日に必要な水分量は体重や活動量によって異なります。適切な水分補給は代謝促進、肌の健康維持に効果的。',
    publishedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'health',
  },
  // さらに20件追加（ページネーション用）
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `${11 + i}`,
    title: `健康に関するニュース ${11 + i}`,
    content: `これはダミーのニュースコンテンツです。実際の運用では、データベースから取得した記事が表示されます。健康管理、運動、睡眠、栄養など様々なトピックをカバーします。`,
    excerpt: `これはダミーのニュースコンテンツです。実際の運用では、データベースから取得した記事が表示されます。`,
    publishedAt: new Date(Date.now() - (10 + i) * 24 * 60 * 60 * 1000).toISOString(),
    category: (['general', 'health', 'feature', 'update'] as const)[i % 4],
  })),
];

// ダミー動画データ（15件）
export const MOCK_VIDEOS: VideoItem[] = [
  {
    id: '1',
    title: '初心者向け10分間ストレッチ - 肩こり・腰痛解消',
    description: 'デスクワークで固まった体をほぐす簡単ストレッチ。毎日続けやすい10分間のルーティンです。',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=225&fit=crop',
    duration: '10:24',
    category: 'exercise',
    publishedAt: new Date().toISOString(),
    viewCount: 125000,
  },
  {
    id: '2',
    title: '深い眠りへ導く瞑想ガイド - 不眠改善',
    description: '寝つきが悪い方におすすめの誘導瞑想。優しい声と環境音で心地よい眠りへ。',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=225&fit=crop',
    duration: '20:15',
    category: 'meditation',
    publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    viewCount: 89000,
  },
  {
    id: '3',
    title: '高タンパク低カロリーレシピ5選',
    description: '筋トレ後の食事に最適！簡単に作れる高タンパク料理を紹介します。',
    thumbnailUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=225&fit=crop',
    duration: '15:30',
    category: 'nutrition',
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    viewCount: 67000,
  },
  {
    id: '4',
    title: '30日チャレンジ：毎朝5分のHIITトレーニング',
    description: '短時間で効果抜群！朝の代謝を上げるハイインテンシティワークアウト。',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=225&fit=crop',
    duration: '5:45',
    category: 'exercise',
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    viewCount: 234000,
  },
  {
    id: '5',
    title: 'ストレス解消呼吸法 - 今すぐできるリラックステクニック',
    description: '4-7-8呼吸法を使った即効性のあるストレス軽減テクニック。',
    thumbnailUrl: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=400&h=225&fit=crop',
    duration: '8:20',
    category: 'mental',
    publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    viewCount: 156000,
  },
  {
    id: '6',
    title: '睡眠の質を上げる夜のルーティン',
    description: '睡眠専門家が教える、ぐっすり眠るための就寝前習慣。',
    thumbnailUrl: 'https://images.unsplash.com/photo-1531353826977-0941b4779a1c?w=400&h=225&fit=crop',
    duration: '12:00',
    category: 'sleep',
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    viewCount: 98000,
  },
  {
    id: '7',
    title: '自宅でできる全身筋トレ - 器具なし30分',
    description: 'ジムに行けない日も安心。自重トレーニングで全身をバランスよく鍛えます。',
    thumbnailUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=225&fit=crop',
    duration: '32:15',
    category: 'exercise',
    publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    viewCount: 312000,
  },
  {
    id: '8',
    title: '腸活レシピ：発酵食品を使った朝食メニュー',
    description: '腸内環境を整える発酵食品たっぷりの朝食レシピ集。免疫力アップにも効果的。',
    thumbnailUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=225&fit=crop',
    duration: '18:45',
    category: 'nutrition',
    publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    viewCount: 45000,
  },
  {
    id: '9',
    title: '5分間マインドフルネス瞑想 - 集中力アップ',
    description: '仕事の合間にできる短時間瞑想。リフレッシュして午後も頑張りましょう。',
    thumbnailUrl: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=400&h=225&fit=crop',
    duration: '5:30',
    category: 'meditation',
    publishedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    viewCount: 178000,
  },
  {
    id: '10',
    title: 'ランニング初心者ガイド - フォームと呼吸法',
    description: '怪我なく楽しく走るためのフォーム解説と効率的な呼吸法を学びます。',
    thumbnailUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400&h=225&fit=crop',
    duration: '22:00',
    category: 'exercise',
    publishedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    viewCount: 89000,
  },
  {
    id: '11',
    title: '不安を和らげるセルフケア習慣',
    description: 'メンタルヘルス専門家が教える、日常で取り入れやすいセルフケア方法。',
    thumbnailUrl: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=400&h=225&fit=crop',
    duration: '14:30',
    category: 'mental',
    publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    viewCount: 134000,
  },
  {
    id: '12',
    title: '夜更かしをやめる！睡眠リズムリセット法',
    description: '乱れた睡眠サイクルを整える具体的なステップを解説します。',
    thumbnailUrl: 'https://images.unsplash.com/photo-1515894203077-9cd36032142f?w=400&h=225&fit=crop',
    duration: '11:45',
    category: 'sleep',
    publishedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
    viewCount: 67000,
  },
  {
    id: '13',
    title: 'ビタミンD不足を解消する食事とライフスタイル',
    description: '現代人に不足しがちなビタミンDを効率よく摂取する方法。',
    thumbnailUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&h=225&fit=crop',
    duration: '16:20',
    category: 'nutrition',
    publishedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    viewCount: 56000,
  },
  {
    id: '14',
    title: 'ヨガ入門：太陽礼拝の完全ガイド',
    description: 'ヨガの基本、太陽礼拝を丁寧に解説。初心者でも安心して始められます。',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=225&fit=crop',
    duration: '25:00',
    category: 'exercise',
    publishedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
    viewCount: 201000,
  },
  {
    id: '15',
    title: 'ポジティブシンキングを身につける習慣',
    description: '認知行動療法に基づいた、前向きな思考パターンを養う方法。',
    thumbnailUrl: 'https://images.unsplash.com/photo-1489844097929-c8d5b91c456e?w=400&h=225&fit=crop',
    duration: '19:15',
    category: 'mental',
    publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    viewCount: 112000,
  },
];

// News取得関数
export function getNews(page: number = 1, perPage: number = 5): {
  news: NewsItem[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
} {
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const news = MOCK_NEWS.slice(start, end);

  return {
    news,
    total: MOCK_NEWS.length,
    page,
    perPage,
    hasMore: end < MOCK_NEWS.length,
  };
}

// Video取得関数
export function getVideos(
  offset: number = 0,
  limit: number = 10,
  category?: string,
  search?: string
): {
  videos: VideoItem[];
  total: number;
  hasMore: boolean;
} {
  let filtered = [...MOCK_VIDEOS];

  // カテゴリフィルター
  if (category && category !== 'all') {
    filtered = filtered.filter(v => v.category === category);
  }

  // 検索フィルター
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(
      v =>
        v.title.toLowerCase().includes(searchLower) ||
        v.description.toLowerCase().includes(searchLower)
    );
  }

  const videos = filtered.slice(offset, offset + limit);

  return {
    videos,
    total: filtered.length,
    hasMore: offset + limit < filtered.length,
  };
}
