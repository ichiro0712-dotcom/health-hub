// 外部データソース → 健康プロフィール質問 マッピング定義

export interface DataFieldMapping {
  questionId: string | null;  // 対応する質問ID（テキスト系はnull）
  field: string;              // フィールド名（日本語）
  type?: 'number' | 'text' | 'sections';  // データ型
  target?: string;            // テキストの場合の追記先セクション
  format?: (value: unknown) => string;  // 値のフォーマット関数
}

export interface DataSourceMapping {
  [key: string]: DataFieldMapping;
}

// HealthRecord（健康診断）からのマッピング
// data JSON内のフィールドに対応
export const HEALTH_RECORD_MAPPING: DataSourceMapping = {
  // 基本測定値
  'bloodPressureHigh': {
    questionId: '1-8',
    field: '収縮期血圧',
    type: 'number',
    format: (v) => `${v} mmHg`
  },
  'bloodPressureLow': {
    questionId: '1-8',
    field: '拡張期血圧',
    type: 'number',
    format: (v) => `${v} mmHg`
  },
  'pulse': {
    questionId: '1-8',
    field: '脈拍数',
    type: 'number',
    format: (v) => `${v} 回/分`
  },
  'weight': {
    questionId: '1-2',
    field: '体重',
    type: 'number',
    format: (v) => `${v} kg`
  },
  'height': {
    questionId: '1-2',
    field: '身長',
    type: 'number',
    format: (v) => `${v} cm`
  },
  'bmi': {
    questionId: '1-2',
    field: 'BMI',
    type: 'number',
    format: (v) => `${Number(v).toFixed(1)}`
  },
  'bodyFatPercentage': {
    questionId: '1-3',
    field: '体脂肪率',
    type: 'number',
    format: (v) => `${v}%`
  },
  'waistCircumference': {
    questionId: '1-4',
    field: 'ウエスト周囲径',
    type: 'number',
    format: (v) => `${v} cm`
  },

  // 血液検査（血糖関連）
  'bloodSugar': {
    questionId: '3-3',
    field: '血糖値',
    type: 'number',
    format: (v) => `${v} mg/dL`
  },
  'hba1c': {
    questionId: '3-3',
    field: 'HbA1c',
    type: 'number',
    format: (v) => `${v}%`
  },

  // 血液検査（脂質）
  'totalCholesterol': {
    questionId: '3-3',
    field: '総コレステロール',
    type: 'number',
    format: (v) => `${v} mg/dL`
  },
  'ldlCholesterol': {
    questionId: '3-3',
    field: 'LDLコレステロール',
    type: 'number',
    format: (v) => `${v} mg/dL`
  },
  'hdlCholesterol': {
    questionId: '3-3',
    field: 'HDLコレステロール',
    type: 'number',
    format: (v) => `${v} mg/dL`
  },
  'triglyceride': {
    questionId: '3-3',
    field: '中性脂肪',
    type: 'number',
    format: (v) => `${v} mg/dL`
  },

  // 肝機能
  'ast': {
    questionId: '3-3',
    field: 'AST(GOT)',
    type: 'number',
    format: (v) => `${v} U/L`
  },
  'alt': {
    questionId: '3-3',
    field: 'ALT(GPT)',
    type: 'number',
    format: (v) => `${v} U/L`
  },
  'gammaGtp': {
    questionId: '3-3',
    field: 'γ-GTP',
    type: 'number',
    format: (v) => `${v} U/L`
  },

  // 腎機能
  'creatinine': {
    questionId: '3-3',
    field: 'クレアチニン',
    type: 'number',
    format: (v) => `${v} mg/dL`
  },
  'uricAcid': {
    questionId: '3-3',
    field: '尿酸',
    type: 'number',
    format: (v) => `${v} mg/dL`
  },
  'egfr': {
    questionId: '3-3',
    field: 'eGFR',
    type: 'number',
    format: (v) => `${v} mL/min/1.73m²`
  },

  // テキストデータ（所見・コメント）
  'findings': {
    questionId: null,
    field: '所見',
    type: 'text',
    target: 'medical_history'
  },
  'notes': {
    questionId: null,
    field: 'メモ',
    type: 'text',
    target: 'medical_history'
  },
  'sections': {
    questionId: null,
    field: 'セクション',
    type: 'sections',
    target: 'medical_history'
  },
};

// HealthRecord の results 配列内の項目名マッピング
export const HEALTH_RECORD_ITEM_MAPPING: { [key: string]: DataFieldMapping } = {
  // 項目名の正規化（様々な表記に対応）
  '血圧（収縮期）': { questionId: '1-8', field: '収縮期血圧', type: 'number' },
  '血圧（拡張期）': { questionId: '1-8', field: '拡張期血圧', type: 'number' },
  '収縮期血圧': { questionId: '1-8', field: '収縮期血圧', type: 'number' },
  '拡張期血圧': { questionId: '1-8', field: '拡張期血圧', type: 'number' },
  '最高血圧': { questionId: '1-8', field: '収縮期血圧', type: 'number' },
  '最低血圧': { questionId: '1-8', field: '拡張期血圧', type: 'number' },
  '脈拍': { questionId: '1-8', field: '脈拍数', type: 'number' },
  '体重': { questionId: '1-2', field: '体重', type: 'number' },
  '身長': { questionId: '1-2', field: '身長', type: 'number' },
  'BMI': { questionId: '1-2', field: 'BMI', type: 'number' },
  '体脂肪率': { questionId: '1-3', field: '体脂肪率', type: 'number' },
  '腹囲': { questionId: '1-4', field: 'ウエスト周囲径', type: 'number' },
  'ウエスト': { questionId: '1-4', field: 'ウエスト周囲径', type: 'number' },
  '空腹時血糖': { questionId: '3-3', field: '空腹時血糖', type: 'number' },
  '血糖': { questionId: '3-3', field: '血糖値', type: 'number' },
  'HbA1c': { questionId: '3-3', field: 'HbA1c', type: 'number' },
  'ヘモグロビンA1c': { questionId: '3-3', field: 'HbA1c', type: 'number' },
};

// FitData からのマッピング
export const FIT_DATA_MAPPING: DataSourceMapping = {
  'heartRate': {
    questionId: '1-8',
    field: '安静時心拍数',
    type: 'number',
    format: (v) => `${Math.round(Number(v))} 回/分`
  },
  'steps': {
    questionId: '8-5',
    field: '歩数',
    type: 'number',
    format: (v) => `${Number(v).toLocaleString()} 歩/日`
  },
  'sleepMinutes': {
    questionId: '5-1',
    field: '睡眠時間',
    type: 'number',
    format: (v) => {
      const hours = Math.floor(Number(v) / 60);
      const mins = Number(v) % 60;
      return `${hours}時間${mins}分`;
    }
  },
  'weight': {
    questionId: '1-2',
    field: '体重',
    type: 'number',
    format: (v) => `${v} kg`
  },
  'calories': {
    questionId: null,
    field: '消費カロリー',
    type: 'number',
    target: 'exercise',
    format: (v) => `${Math.round(Number(v))} kcal`
  },
  'distance': {
    questionId: null,
    field: '移動距離',
    type: 'number',
    target: 'exercise',
    format: (v) => `${(Number(v) / 1000).toFixed(1)} km`
  },
};

// DetailedSleep からのマッピング
export const DETAILED_SLEEP_MAPPING: DataSourceMapping = {
  'duration': {
    questionId: '5-1',
    field: '睡眠時間',
    type: 'number',
    format: (v) => {
      const hours = Math.floor(Number(v) / 60);
      const mins = Number(v) % 60;
      return `${hours}時間${mins}分`;
    }
  },
  'efficiency': {
    questionId: '5-3',
    field: '睡眠効率',
    type: 'number',
    format: (v) => `${v}%`
  },
  'minutesDeep': {
    questionId: '5-3',
    field: '深い睡眠',
    type: 'number',
    format: (v) => `${v}分`
  },
  'minutesRem': {
    questionId: '5-3',
    field: 'レム睡眠',
    type: 'number',
    format: (v) => `${v}分`
  },
};

// HrvData からのマッピング
export const HRV_DATA_MAPPING: DataSourceMapping = {
  'dailyRmssd': {
    questionId: null,  // 直接対応する質問はないが、生理機能セクションに追記
    field: 'HRV (RMSSD)',
    type: 'number',
    target: 'physiology',
    format: (v) => `${Math.round(Number(v))} ms`
  },
};

// Supplement からのマッピング
export const SUPPLEMENT_MAPPING: DataSourceMapping = {
  'list': {
    questionId: '7-2',
    field: 'サプリメント一覧',
    type: 'text',
  },
};

// LifestyleHabit からのマッピング
export const LIFESTYLE_HABIT_MAPPING: { [habitName: string]: DataFieldMapping } = {
  'Alcohol': {
    questionId: '7-3',
    field: '飲酒',
    type: 'text',
  },
  'Tobacco': {
    questionId: '7-4',
    field: '喫煙',
    type: 'text',
  },
  'お酒': {
    questionId: '7-3',
    field: '飲酒',
    type: 'text',
  },
  'タバコ': {
    questionId: '7-4',
    field: '喫煙',
    type: 'text',
  },
  '喫煙': {
    questionId: '7-4',
    field: '喫煙',
    type: 'text',
  },
};

// 質問ID → セクションID マッピング（逆引き用）
export const QUESTION_TO_SECTION: { [questionId: string]: string } = {
  '1-1': 'basic_attributes',
  '1-2': 'basic_attributes',
  '1-3': 'basic_attributes',
  '1-4': 'basic_attributes',
  '1-5': 'basic_attributes',
  '1-6': 'basic_attributes',
  '1-7': 'basic_attributes',
  '1-8': 'basic_attributes',
  '1-9': 'basic_attributes',
  '1-10': 'basic_attributes',
  '3-3': 'medical_history',
  '5-1': 'circadian',
  '5-2': 'circadian',
  '5-3': 'circadian',
  '7-2': 'substances',
  '7-3': 'substances',
  '7-4': 'substances',
  '8-5': 'exercise',
};

// データソースの種類
export type ExternalDataSource =
  | 'healthRecord'
  | 'fitData'
  | 'detailedSleep'
  | 'hrvData'
  | 'supplement'
  | 'lifestyleHabit';

// 全マッピングをまとめたオブジェクト
export const ALL_MAPPINGS = {
  healthRecord: HEALTH_RECORD_MAPPING,
  fitData: FIT_DATA_MAPPING,
  detailedSleep: DETAILED_SLEEP_MAPPING,
  hrvData: HRV_DATA_MAPPING,
  supplement: SUPPLEMENT_MAPPING,
  lifestyleHabit: LIFESTYLE_HABIT_MAPPING,
};
