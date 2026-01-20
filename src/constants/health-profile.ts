// 健康プロフィールのデフォルトカテゴリ定義
export const DEFAULT_PROFILE_CATEGORIES = [
    { id: 'basic_attributes', title: '1. 基本属性・バイオメトリクス', order: 1 },
    { id: 'genetics', title: '2. 遺伝・家族歴', order: 2 },
    { id: 'medical_history', title: '3. 病歴・医療ステータス', order: 3 },
    { id: 'physiology', title: '4. 生理機能・体質', order: 4 },
    { id: 'circadian', title: '5. 生活リズム', order: 5 },
    { id: 'diet_nutrition', title: '6. 食生活・栄養', order: 6 },
    { id: 'substances', title: '7. 嗜好品・サプリメント・薬', order: 7 },
    { id: 'exercise', title: '8. 運動・身体活動', order: 8 },
    { id: 'mental', title: '9. メンタル・脳機能', order: 9 },
    { id: 'beauty_hygiene', title: '10. 美容・衛生習慣', order: 10 },
    { id: 'environment', title: '11. 環境・社会・ライフスタイル', order: 11 },
];

export interface HealthProfileSectionData {
    id?: string;
    categoryId: string;
    title: string;
    content: string;
    orderIndex: number;
}
