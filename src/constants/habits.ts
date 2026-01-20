export const CATEGORIES = [
    { id: 'preferences', label: '嗜好品（リスク管理）' },
    { id: 'diet', label: '食生活' },
    { id: 'sleep', label: '睡眠' },
    { id: 'exercise', label: '運動' },
    { id: 'care', label: 'その他ケア・メンタル' },
];

export const PREDEFINED_ITEMS: Record<string, { name: string, inputs: { label: string, key: string, suffix: string, type?: string }[] }[]> = {
    preferences: [
        { name: 'タバコ', inputs: [{ label: '頻度', key: 'weekly', suffix: '本/週' }, { label: '通算', key: 'years', suffix: '年' }] },
        { name: 'お酒', inputs: [{ label: '頻度', key: 'weekly_times', suffix: '回/週' }, { label: '量', key: 'amount_per_time', suffix: '杯/回' }] },
        { name: '清涼飲料水', inputs: [{ label: '頻度', key: 'weekly', suffix: '本/週' }, { label: '量', key: 'amount_ml', suffix: 'ml/本' }] },
    ],
    diet: [
        { name: '発酵食品', inputs: [{ label: '摂取頻度', key: 'days_per_week', suffix: '日/週' }] },
        { name: 'ベジファースト', inputs: [{ label: '実施率', key: 'rate', suffix: '%' }] },
        { name: '超加工食品', inputs: [{ label: '頻度', key: 'times_per_week', suffix: '回/週' }] },
        { name: '夕食〜就寝', inputs: [{ label: '間隔', key: 'hours', suffix: '時間' }] },
        { name: '水分補給', inputs: [{ label: '1日', key: 'amount', suffix: 'ml' }] },
    ],
    sleep: [
        { name: '睡眠時間', inputs: [{ label: '平均', key: 'hours', suffix: '時間/日' }] },
        { name: '起床差', inputs: [{ label: 'バラつき', key: 'variation_min', suffix: '分' }] },
        { name: '就寝前スマホ', inputs: [{ label: '使用停止', key: 'min_before_sleep', suffix: '分前' }] },
        { name: '入眠時間', inputs: [{ label: '所要時間', key: 'min_to_sleep', suffix: '分' }] },
    ],
    exercise: [
        { name: '有酸素運動', inputs: [{ label: '頻度', key: 'times_per_week', suffix: '回/週' }, { label: '時間', key: 'min_per_time', suffix: '分/回' }] },
        { name: '筋トレ', inputs: [{ label: '頻度', key: 'times_per_week', suffix: '回/週' }] },
        { name: '歩数', inputs: [{ label: '平均', key: 'steps', suffix: '歩/日' }] },
        { name: '座り時間', inputs: [{ label: '日中', key: 'hours', suffix: '時間/日' }] },
    ],
    care: [
        { name: 'フロス', inputs: [{ label: '頻度', key: 'times_per_week', suffix: '回/週' }] },
        { name: '入浴', inputs: [{ label: '頻度', key: 'times_per_week', suffix: '回/週' }] },
        { name: 'デトックス', inputs: [{ label: '画面オフ', key: 'min_per_day', suffix: '分/日' }] },
        { name: '瞑想', inputs: [{ label: '頻度', key: 'times_per_week', suffix: '回/週' }] },
        { name: '歯科検診', inputs: [{ label: '頻度', key: 'times_per_year', suffix: '回/年' }] },
    ]
};
