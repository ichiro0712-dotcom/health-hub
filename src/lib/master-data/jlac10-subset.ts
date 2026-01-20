// カテゴリ定義と表示順序
export type CategoryCode =
    | 'body_measurement'   // 身体計測
    | 'blood_pressure'     // 血圧
    | 'lipid'              // 脂質代謝
    | 'liver'              // 肝機能
    | 'glucose'            // 糖代謝
    | 'kidney'             // 腎機能
    | 'blood_cell'         // 血球検査
    | 'fitness'            // フィットネス（スマホデータ）
    | 'sleep'              // 睡眠データ
    | 'vitals'             // バイタル
    | 'other';             // その他

export interface CategoryDefinition {
    code: CategoryCode;
    name: string;
    order: number;
}

// カテゴリの表示順序定義
export const CATEGORY_ORDER: CategoryDefinition[] = [
    { code: 'body_measurement', name: '身体計測', order: 1 },
    { code: 'blood_pressure', name: '血圧', order: 2 },
    { code: 'lipid', name: '脂質代謝', order: 3 },
    { code: 'liver', name: '肝機能', order: 4 },
    { code: 'glucose', name: '糖代謝', order: 5 },
    { code: 'kidney', name: '腎機能', order: 6 },
    { code: 'blood_cell', name: '血球検査', order: 7 },
    { code: 'vitals', name: 'バイタル', order: 8 },
    { code: 'fitness', name: 'フィットネス', order: 9 },
    { code: 'sleep', name: '睡眠', order: 10 },
    { code: 'other', name: 'その他', order: 99 },
];

export type MasterItemSeed = {
    code: string;
    standardName: string;
    jlac10?: string;
    synonyms: string[];
    category: CategoryCode;
    orderInCategory: number;
};

export const MASTER_ITEMS_SEED: MasterItemSeed[] = [
    // --- 身体計測 ---
    {
        code: 'bmi',
        standardName: 'BMI',
        synonyms: ['BMI', 'Body Mass Index', '体格指数', 'ボディマス指数'],
        category: 'body_measurement',
        orderInCategory: 1
    },
    {
        code: 'body_weight',
        standardName: '体重',
        synonyms: ['体重', 'Weight', 'Body Weight', 'BW'],
        category: 'body_measurement',
        orderInCategory: 2
    },
    {
        code: 'abdominal_circumference',
        standardName: '腹囲',
        synonyms: ['腹囲', 'Waist', 'ウエスト', '腹部周囲径', 'Waist Circumference', '腹囲周囲径'],
        category: 'body_measurement',
        orderInCategory: 3
    },

    // --- 血圧 ---
    {
        code: 'systolic_bp',
        standardName: '収縮期血圧',
        synonyms: ['収縮期血圧', '最高血圧', 'Systolic BP', 'SBP', '血圧(上)', '血圧（上）', '血圧上', 'Systolic Blood Pressure'],
        category: 'blood_pressure',
        orderInCategory: 1
    },
    {
        code: 'diastolic_bp',
        standardName: '拡張期血圧',
        synonyms: ['拡張期血圧', '最低血圧', 'Diastolic BP', 'DBP', '血圧(下)', '血圧（下）', '血圧下', 'Diastolic Blood Pressure'],
        category: 'blood_pressure',
        orderInCategory: 2
    },

    // --- 脂質代謝 ---
    {
        code: 'triglyceride',
        standardName: '中性脂肪',
        jlac10: '30235-0',
        synonyms: [
            '中性脂肪', 'TG', 'Triglyceride', 'Triglycerides', 'トリグリセライド', 'トリグリセリド',
            '中性脂肪(TG)', 'TG(中性脂肪)', 'Triglyceride (中性脂肪)', '血清TG'
        ],
        category: 'lipid',
        orderInCategory: 1
    },
    {
        code: 'hdl_cholesterol',
        standardName: 'HDLコレステロール',
        jlac10: '30278-6',
        synonyms: [
            'HDLコレステロール', 'HDL-C', 'HDL', '善玉コレステロール', 'HDL Cholesterol',
            'HDL-コレステロール', 'HDLcholesterol', 'HDL-Cho', 'HDL-cho',
            'HDL Cholesterol (HDLコレステロール)', 'HDL-C(HDLコレステロール)', '血清HDL'
        ],
        category: 'lipid',
        orderInCategory: 2
    },
    {
        code: 'ldl_cholesterol',
        standardName: 'LDLコレステロール',
        jlac10: '30283-6',
        synonyms: [
            'LDLコレステロール', 'LDL-C', 'LDL', '悪玉コレステロール', 'LDL Cholesterol',
            'LDL-コレステロール', 'LDLcholesterol', 'LDL-Cho', 'LDL-cho',
            'LDL Cholesterol (LDLコレステロール)', 'LDL-C(LDLコレステロール)', '血清LDL'
        ],
        category: 'lipid',
        orderInCategory: 3
    },
    {
        code: 'total_cholesterol',
        standardName: '総コレステロール',
        jlac10: '30292-7',
        synonyms: [
            '総コレステロール', 'TC', 'T-Cho', 'T-CHO', 'Total Cholesterol', 'TCho',
            'Total Cholesterol (総コレステロール)', '血清総コレステロール', 'T.Cho'
        ],
        category: 'lipid',
        orderInCategory: 4
    },
    {
        code: 'non_hdl_cholesterol',
        standardName: 'Non-HDLコレステロール',
        synonyms: ['Non-HDLコレステロール', 'Non-HDL', 'non-HDL-C', 'non HDLコレステロール', 'nonHDLコレステロール'],
        category: 'lipid',
        orderInCategory: 5
    },

    // --- 肝機能 ---
    {
        code: 'ast',
        standardName: 'AST(GOT)',
        jlac10: '30114-1',
        synonyms: [
            'AST', 'GOT', 'AST(GOT)', 'AST（GOT）', 'GOT(AST)', 'GOT（AST）',
            'アスパラギン酸アミノトランスフェラーゼ', 'AST/GOT', 'GOT/AST', '血清AST', '血清GOT'
        ],
        category: 'liver',
        orderInCategory: 1
    },
    {
        code: 'alt',
        standardName: 'ALT(GPT)',
        jlac10: '30107-5',
        synonyms: [
            'ALT', 'GPT', 'ALT(GPT)', 'ALT（GPT）', 'GPT(ALT)', 'GPT（ALT）',
            'アラニンアミノトランスフェラーゼ', 'ALT/GPT', 'GPT/ALT', '血清ALT', '血清GPT'
        ],
        category: 'liver',
        orderInCategory: 2
    },
    {
        code: 'gamma_gtp',
        standardName: 'γ-GTP',
        jlac10: '30129-9',
        synonyms: [
            'γ-GTP', 'γGTP', 'γ-GT', 'γGT', 'G-GTP', 'GGTP',
            'ガンマGTP', 'ガンマ-GTP', 'Gamma-GTP', 'Gamma GTP', 'GGT',
            'γ-グルタミルトランスペプチダーゼ', '血清γ-GTP'
        ],
        category: 'liver',
        orderInCategory: 3
    },
    {
        code: 'alp',
        standardName: 'ALP',
        synonyms: ['ALP', 'アルカリホスファターゼ', 'アルカリフォスファターゼ', 'Alkaline Phosphatase', '血清ALP'],
        category: 'liver',
        orderInCategory: 4
    },
    {
        code: 'ldh',
        standardName: 'LDH',
        synonyms: ['LDH', '乳酸脱水素酵素', 'Lactate Dehydrogenase', 'LD', '血清LDH'],
        category: 'liver',
        orderInCategory: 5
    },
    {
        code: 'total_bilirubin',
        standardName: '総ビリルビン',
        synonyms: ['総ビリルビン', 'T-Bil', 'T-BIL', 'Total Bilirubin', 'ビリルビン', '血清ビリルビン'],
        category: 'liver',
        orderInCategory: 6
    },
    {
        code: 'albumin',
        standardName: 'アルブミン',
        synonyms: ['アルブミン', 'Alb', 'ALB', 'Albumin', '血清アルブミン'],
        category: 'liver',
        orderInCategory: 7
    },
    {
        code: 'total_protein',
        standardName: '総タンパク',
        synonyms: ['総タンパク', '総蛋白', 'TP', 'Total Protein', 'T-Protein', '血清総タンパク'],
        category: 'liver',
        orderInCategory: 8
    },

    // --- 糖代謝 ---
    {
        code: 'fasting_blood_glucose',
        standardName: '空腹時血糖',
        synonyms: [
            '空腹時血糖', 'FPG', 'FBS', '血糖', 'Glucose', 'Glu', 'GLU',
            'Fasting Blood Glucose', 'Fasting Blood Sugar', 'Fasting Glucose',
            '空腹時血糖値', '血糖値', 'BS', '血清血糖'
        ],
        category: 'glucose',
        orderInCategory: 1
    },
    {
        code: 'hba1c',
        standardName: 'HbA1c',
        jlac10: '30896-6',
        synonyms: [
            'HbA1c', 'HbA1c(NGSP)', 'HbA1C', 'ヘモグロビンA1c', 'グリコヘモグロビン',
            'HbA1c (NGSP)', 'Hemoglobin A1c', 'A1C', 'A1c', 'グリコアルブミン',
            'HbA1c（NGSP）'
        ],
        category: 'glucose',
        orderInCategory: 2
    },

    // --- 腎機能 ---
    {
        code: 'bun',
        standardName: '尿素窒素(BUN)',
        synonyms: [
            '尿素窒素', 'BUN', '尿素窒素(BUN)', '尿素窒素（BUN）', 'Blood Urea Nitrogen',
            'UN', 'Urea Nitrogen', '血清尿素窒素'
        ],
        category: 'kidney',
        orderInCategory: 1
    },
    {
        code: 'creatinine',
        standardName: 'クレアチニン',
        synonyms: [
            'クレアチニン', 'Cr', 'CRE', 'Creatinine', 'Cre', 'CREA',
            '血清クレアチニン', 'S-Cr', 'sCr'
        ],
        category: 'kidney',
        orderInCategory: 2
    },
    {
        code: 'egfr',
        standardName: 'eGFR',
        synonyms: [
            'eGFR', '推算糸球体濾過量', 'GFR', '推算GFR', 'Estimated GFR',
            '糸球体濾過量', '推定GFR', 'eGFR(推算糸球体濾過量)'
        ],
        category: 'kidney',
        orderInCategory: 3
    },
    {
        code: 'ua',
        standardName: '尿酸(UA)',
        synonyms: [
            '尿酸', 'UA', 'Uric Acid', '尿酸(UA)', '尿酸（UA）', 'SUA',
            '血清尿酸', '血清尿酸値'
        ],
        category: 'kidney',
        orderInCategory: 4
    },

    // --- 血球検査 ---
    {
        code: 'rbc',
        standardName: '赤血球数',
        synonyms: [
            '赤血球数', 'RBC', 'Red Blood Cell', 'Red Blood Cells', 'Red Cell Count',
            '赤血球', 'Erythrocyte', 'Erythrocytes', 'RBC Count'
        ],
        category: 'blood_cell',
        orderInCategory: 1
    },
    {
        code: 'wbc',
        standardName: '白血球数',
        synonyms: [
            '白血球数', 'WBC', 'White Blood Cell', 'White Blood Cells', 'White Cell Count',
            '白血球', 'Leukocyte', 'Leukocytes', 'WBC Count'
        ],
        category: 'blood_cell',
        orderInCategory: 2
    },
    {
        code: 'hemoglobin',
        standardName: 'ヘモグロビン',
        synonyms: [
            'ヘモグロビン', 'Hb', 'Hgb', 'HGB', 'Hemoglobin', 'Haemoglobin',
            '血色素量', '血色素', '血清ヘモグロビン'
        ],
        category: 'blood_cell',
        orderInCategory: 3
    },
    {
        code: 'hematocrit',
        standardName: 'ヘマトクリット',
        synonyms: [
            'ヘマトクリット', 'Ht', 'Hct', 'HCT', 'Hematocrit', 'Haematocrit',
            'ヘマトクリット値', 'PCV', 'Packed Cell Volume'
        ],
        category: 'blood_cell',
        orderInCategory: 4
    },
    {
        code: 'platelet',
        standardName: '血小板数',
        synonyms: [
            '血小板数', 'Plt', 'PLT', 'Platelet', 'Platelets', 'Platelet Count',
            '血小板', 'Thrombocyte', 'Thrombocytes'
        ],
        category: 'blood_cell',
        orderInCategory: 5
    }
];

// スマホデータ用の項目定義（MasterItemに含まれないもの）
export interface SmartphoneItemDefinition {
    name: string;
    category: CategoryCode;
    orderInCategory: number;
}

export const SMARTPHONE_ITEMS: SmartphoneItemDefinition[] = [
    // バイタル
    { name: '安静時心拍数', category: 'vitals', orderInCategory: 1 },
    { name: '体温', category: 'vitals', orderInCategory: 2 },
    { name: '酸素飽和度', category: 'vitals', orderInCategory: 3 },
    { name: '呼吸数', category: 'vitals', orderInCategory: 4 },
    { name: '皮膚温度変化', category: 'vitals', orderInCategory: 5 },
    { name: 'HRV(RMSSD)', category: 'vitals', orderInCategory: 6 },
    { name: 'HRV(深睡眠)', category: 'vitals', orderInCategory: 7 },

    // フィットネス
    { name: '歩数', category: 'fitness', orderInCategory: 1 },
    { name: '移動距離', category: 'fitness', orderInCategory: 2 },
    { name: '消費カロリー', category: 'fitness', orderInCategory: 3 },
    { name: '脂肪燃焼(分)', category: 'fitness', orderInCategory: 4 },
    { name: '有酸素運動(分)', category: 'fitness', orderInCategory: 5 },
    { name: 'ピーク運動(分)', category: 'fitness', orderInCategory: 6 },

    // 睡眠
    { name: '睡眠時間(分)', category: 'sleep', orderInCategory: 1 },
    { name: '睡眠効率(%)', category: 'sleep', orderInCategory: 2 },
    { name: '深い睡眠(分)', category: 'sleep', orderInCategory: 3 },
    { name: '浅い睡眠(分)', category: 'sleep', orderInCategory: 4 },
    { name: 'REM睡眠(分)', category: 'sleep', orderInCategory: 5 },
    { name: '覚醒時間(分)', category: 'sleep', orderInCategory: 6 },
];

// 項目名からカテゴリ情報を取得するヘルパー
export function getItemCategoryInfo(itemName: string): { category: CategoryCode; orderInCategory: number } {
    // MasterItemから検索
    const masterItem = MASTER_ITEMS_SEED.find(
        m => m.standardName === itemName || m.synonyms.includes(itemName)
    );
    if (masterItem) {
        return { category: masterItem.category, orderInCategory: masterItem.orderInCategory };
    }

    // SmartphoneItemsから検索
    const smartphoneItem = SMARTPHONE_ITEMS.find(s => s.name === itemName);
    if (smartphoneItem) {
        return { category: smartphoneItem.category, orderInCategory: smartphoneItem.orderInCategory };
    }

    // 見つからない場合はother
    return { category: 'other', orderInCategory: 999 };
}

// カテゴリ順でソートするための比較関数
export function compareItemsByCategory(a: string, b: string): number {
    const aInfo = getItemCategoryInfo(a);
    const bInfo = getItemCategoryInfo(b);

    const aCatOrder = CATEGORY_ORDER.find(c => c.code === aInfo.category)?.order ?? 99;
    const bCatOrder = CATEGORY_ORDER.find(c => c.code === bInfo.category)?.order ?? 99;

    // まずカテゴリ順で比較
    if (aCatOrder !== bCatOrder) {
        return aCatOrder - bCatOrder;
    }

    // 同じカテゴリ内ではorderInCategoryで比較
    return aInfo.orderInCategory - bInfo.orderInCategory;
}
