# チャットヒアリング機能 仕様書

## 概要

健康プロフィールページの上部に配置する、AIとの対話形式で健康情報を収集する機能。
ユーザーが既存の健康プロフ情報を効率的に埋めていけるよう、AIが質問を通じてガイドする。

## 機能要件

### 1. 基本動作

- **位置**: 健康プロフページ（`/health-profile`）の最上部
- **開始方法**: 「チャットで埋める」ボタンをクリックでチャットエリアが展開
- **AIモデル**: 既存のGemini API（`gemini-2.5-pro`）を使用

### 2. 質問フロー

#### 2.1 重要度ベースの順序

```
重要度3（必須情報）→ 重要度2（詳しい情報）→ 重要度1（さらに詳しい情報）
```

- 全11セクションの**重要度3の質問を先に**全て埋める
- 重要度3が完了したら「詳しい情報を入れますか？」と確認
- 「はい」の場合、自動的に次のセクションの重要度2→1へ進む

#### 2.2 質問スタイル

- **1問ずつ丁寧に**質問
- 既存の回答がある場合:
  - その質問をスキップ、または
  - 足りない部分を具体的に質問

#### 2.3 既存プロフィール内容の検証（AI判定方式）

セッション開始時に、AIが既存の `HealthProfileSection` の内容を検証し、質問が必要かどうかを判断する。

**処理フロー:**

```
セッション開始時（POST /api/health-chat/session）
  │
  ├─ 1. 全セクションの HealthProfileSection.content を取得
  │
  ├─ 2. 各セクションの内容 + 質問の extractionHints を AI に渡す
  │
  ├─ 3. AI が判定:
  │     - 「有効な情報が含まれている」→ 質問をスキップ（回答済みとしてマーク）
  │     - 「無効/曖昧/不足」→ 質問を残す
  │
  └─ 4. 判定結果を HealthQuestionProgress に記録
```

**AI判定の基準:**
- 質問の `extractionHints` に対応する具体的な情報が含まれているか
- 内容が意味をなすか（「あああ」「テスト」などは無効）
- 数値が必要な項目に数値が入っているか

**メリット:**
- 文字数ベースの機械的な判定より精度が高い
- 曖昧な回答や無効なデータを正しく検出できる
- 直接入力・チャット入力どちらの内容も同じ基準で検証

**注意:**
- セッション開始時のみAI判定を行う（数秒の遅延あり）
- チャット中の各質問は軽量（該当セクションの情報のみ使用）

**デバッグログ:**
セッション開始時に以下のログが出力される（サーバーコンソール）:
```
[AI Validation] Starting validation for user: xxx
[AI Validation] Received profiles: [{ categoryId, contentLength, contentPreview }]
[AI Validation] Sections with content (>10 chars): N
[AI Validation] Questions to validate: ["5-1", "5-2", ...]
[AI Validation] Validation data prepared: [{ sectionId, questionCount, questionIds }]
[AI Validation] Sending prompt to Gemini API...
[AI Validation] AI response (first 500 chars): ...
[AI Validation] Parsed results: [{ questionId, isAnswered }]
[AI Validation] Questions marked as ANSWERED: ["5-1", ...]
[Session New/Resume] Total questions marked as answered: N
[Session New/Resume] All answered question IDs: [...]
[Session New/Resume] Next question: "X-Y"
```

これらのログを確認することで、AI検証が正しく動作しているか診断できる。

### 3. データ管理

#### 3.1 保存先

| データ種別 | 保存先 |
|-----------|--------|
| チャット履歴 | 新規テーブル `health_chat_history` |
| 回答内容 | 既存の `health_profile_sections.content` に追記 |

#### 3.2 中断・再開

- ユーザーが「ここまで保存して」と発言 → 即座に保存＆チャット終了
- 次回開始時は中断したところから再開可能
- 初回メッセージで案内:
  > 「途中で辞めたいときは『ここまで保存して』と言ってください」

### 4. 進捗可視化

#### 4.1 全体プログレスバー

```
■■■■■□□□□□ 45% 完了
```

- 全質問数に対する回答済み割合

#### 4.2 セクション別チェックリスト

```
1. 基本属性・バイオメトリクス
   ★★★ ■■■ (3/3)  ★★ ■□ (1/2)  ★ □□□ (0/3)

2. 遺伝・家族歴
   ★★★ ■■□ (2/3)  ★★ □□ (0/2)  ★ □ (0/1)
```

- 重要度別の完了状況を視覚的に表示

### 5. UI/UX 設計

#### 5.1 チャットエリア構成

```
┌─────────────────────────────────────────────┐
│ [チャットで埋める] ボタン                    │ ← 初期状態
└─────────────────────────────────────────────┘

↓ クリック後展開

┌─────────────────────────────────────────────┐
│ ■■■■■□□□□□ 45% 完了                        │ ← 全体進捗
├─────────────────────────────────────────────┤
│                                             │
│ AI: こんにちは！健康プロフィールを一緒に    │
│     埋めていきましょう。                    │
│     途中で辞めたいときは「ここまで保存して」│
│     と言ってください。                      │
│                                             │
│     まず、生年月日と現在の年齢を教えて      │
│     ください。                              │
│                                             │
│                    User: 1985年3月15日生まれ │
│                          の40歳です         │
│                                             │
│ AI: ありがとうございます。では次に...       │
│                                             │
├─────────────────────────────────────────────┤
│ [入力欄                              ] [送信]│
├─────────────────────────────────────────────┤
│ セクション進捗:                             │
│ 1.基本属性 ★★★ ■□□  2.遺伝 ★★★ □□□        │
│ 3.病歴 ★★★ □□□  4.生理機能 ★★★ □□□        │
│ ...                                         │
└─────────────────────────────────────────────┘
```

#### 5.2 カラースキーム

- 未完了: `slate-300` (グレー)
- 完了: `teal-500` (メインカラー)
- 進行中: `amber-500` (アンバー)

## データベース設計

### 新規テーブル: `health_chat_history`

```sql
CREATE TABLE health_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,  -- チャットセッション識別子
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- セッション状態管理
  session_status TEXT DEFAULT 'active' CHECK (session_status IN ('active', 'completed', 'paused')),

  -- 進捗トラッキング
  current_section_id TEXT,  -- 現在のセクションID
  current_priority INTEGER,  -- 現在の重要度 (1, 2, 3)
  current_question_id TEXT,  -- 現在の質問ID

  INDEX idx_chat_history_user (user_id),
  INDEX idx_chat_history_session (session_id)
);
```

### 新規テーブル: `health_question_progress`

```sql
CREATE TABLE health_question_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,  -- 例: "1-1", "2-3"
  section_id TEXT NOT NULL,   -- 例: "basic_attributes"
  priority INTEGER NOT NULL,  -- 1, 2, 3
  is_answered BOOLEAN DEFAULT FALSE,
  answer_summary TEXT,        -- AIが抽出した回答の要約
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, question_id)
);
```

## API設計

### POST `/api/health-chat`

チャットメッセージの送受信

**Request:**
```json
{
  "message": "1985年3月15日生まれの40歳です",
  "sessionId": "uuid-session-id"
}
```

**Response:**
```json
{
  "success": true,
  "response": "ありがとうございます。記録しました。次の質問です...",
  "progress": {
    "overall": 45,
    "sections": [
      {
        "id": "basic_attributes",
        "name": "基本属性・バイオメトリクス",
        "priority3": { "total": 3, "completed": 2 },
        "priority2": { "total": 2, "completed": 0 },
        "priority1": { "total": 3, "completed": 0 }
      }
    ]
  },
  "updatedContent": {
    "sectionId": "basic_attributes",
    "appendedText": "- 生年月日: 1985年3月15日\n- 年齢: 40歳\n"
  }
}
```

### GET `/api/health-chat/session`

セッション状態の取得（進捗確認用、AI判定なし）

**Response:**
```json
{
  "hasActiveSession": true,
  "sessionId": "uuid-session-id",
  "progress": { ... },
  "lastQuestion": "現在の身長・体重を教えてください",
  "canResume": true
}
```

### POST `/api/health-chat/session`

セッション開始・再開（**AI判定あり**）

**処理内容:**
1. 既存プロフィール内容を取得
2. AIに全質問と既存内容を渡して、回答済みかどうかを判定
3. 判定結果を `HealthQuestionProgress` に記録
4. 最初の未回答質問からウェルカムメッセージを生成

**Request:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid-session-id",
  "isResumed": false,
  "messages": [
    { "role": "assistant", "content": "こんにちは！..." }
  ],
  "welcomeMessage": "こんにちは！...",
  "nextQuestion": {
    "id": "1-1",
    "question": "生年月日と現在の年齢を教えてください。",
    "sectionId": "basic_attributes",
    "sectionName": "1. 基本属性・バイオメトリクス"
  }
}
```

**注意:** AI判定により、セッション開始に数秒かかる場合がある

**フロントエンド表示:**
- セッション開始時、ボタンに「プロフィールを確認中...」→「チャットを準備中...」と段階的に表示
- AI検証に時間がかかってもユーザーに状況が伝わる

### POST `/api/health-chat/save`

「ここまで保存して」の処理

**Response:**
```json
{
  "success": true,
  "message": "ここまでの回答を保存しました",
  "savedSections": ["basic_attributes", "genetics"]
}
```

## 質問マスターデータ

`src/constants/health-questions.ts` に全質問を定義:

```typescript
export interface HealthQuestion {
  id: string;           // "1-1", "1-2", etc.
  sectionId: string;    // "basic_attributes"
  priority: 1 | 2 | 3;  // 3が最重要
  question: string;
  intent: string;       // 質問の意図・評価目的
  extractionHints: string[];  // AIが回答から抽出すべき情報
}

export const HEALTH_QUESTIONS: HealthQuestion[] = [
  {
    id: "1-1",
    sectionId: "basic_attributes",
    priority: 3,
    question: "生年月日と現在の年齢を教えてください。",
    intent: "暦年齢の確認。",
    extractionHints: ["生年月日", "年齢"]
  },
  // ... 全質問を定義
];
```

## 実装ファイル構成

```
src/
├── app/
│   ├── api/
│   │   └── health-chat/
│   │       ├── route.ts           # メインチャットAPI
│   │       ├── session/route.ts   # セッション管理API
│   │       └── save/route.ts      # 保存API
│   └── health-profile/
│       └── page.tsx               # 既存ページ（変更）
├── components/
│   └── health-profile/
│       ├── ChatHearing.tsx        # チャットメインコンポーネント
│       ├── ChatProgress.tsx       # 進捗表示コンポーネント
│       ├── ChatMessage.tsx        # メッセージ表示
│       └── SectionProgress.tsx    # セクション別進捗
├── constants/
│   └── health-questions.ts        # 質問マスター
└── lib/
    └── health-chat.ts             # チャットロジック
```

## AIプロンプト設計

### セッション開始時の検証プロンプト（AI判定用）

```
あなたは健康プロフィールの内容を検証するAIです。

## タスク
以下の質問に対して、既存のプロフィール内容に有効な回答が含まれているか判定してください。

## 判定基準
- 質問の「抽出すべき情報」に対応する具体的な情報が含まれている → 回答済み
- 内容が曖昧、不完全、または意味をなさない（例：「あああ」「テスト」） → 未回答
- 数値が必要な項目に数値がない → 未回答
- 情報が全くない → 未回答

## 入力
セクション: {sectionName}
質問: {question}
抽出すべき情報: {extractionHints}
既存の内容: {existingContent}

## 出力形式（JSON）
{
  "questionId": "1-1",
  "isAnswered": true/false,
  "reason": "判定理由（簡潔に）"
}
```

### チャット中のシステムプロンプト

```
あなたは健康プロフィールのヒアリングを行うAIアシスタントです。

## 役割
- ユーザーから健康に関する情報を丁寧に聞き取る
- 1つずつ質問し、回答を待つ
- 回答から必要な情報を抽出し、プロフィールに反映できる形でまとめる
- **既存の情報がある場合は内容を確認し、不足があれば追加質問する**

## ルール
1. 1度に1つの質問のみ行う
2. 回答が曖昧な場合は確認の質問をする
3. 「ここまで保存して」と言われたら、保存完了を伝えて会話を終了する
4. 回答に対して簡潔な相槌やコメントを入れてから次の質問へ進む
5. ユーザーの回答から健康プロフィールに記載すべき情報を抽出する
6. **既存情報が意味をなさない場合（例：「あああ」「テスト」など）は無効とみなし、改めて質問する**

## 現在の状態
- 回答済み質問数: {answeredCount}/{totalPriority3}（必須質問）
- 既存の情報: {existingContent}

## 次の質問
質問ID: {questionId}
セクション: {sectionName}
質問: {question}
意図: {intent}
抽出すべき情報: {extractionHints}

## 回答形式
ユーザーの回答に対して:
1. 簡潔な相槌（1文）
2. 抽出した情報の確認（必要な場合）
3. 次の質問

回答から抽出した情報は、以下のJSON形式で最後に含めてください（ユーザーには見せません）:
<!--EXTRACTED_DATA
{
  "questionId": "{questionId}",
  "sectionId": "{sectionId}",
  "extractedInfo": {
    "項目名": "値"
  },
  "profileText": "プロフィールに追記するテキスト（箇条書き形式）",
  "existingDataValid": true/false
}
EXTRACTED_DATA-->
```

## テスト計画

1. **単体テスト**
   - 質問の順序制御
   - 回答からの情報抽出
   - 進捗計算

2. **結合テスト**
   - チャット→プロフィール反映
   - セッション中断・再開
   - 重要度切り替え

3. **E2Eテスト**
   - 全フロー完了
   - 途中保存
   - エラーハンドリング

## 開発フェーズ

### Phase 1: 基盤構築
- [ ] DBテーブル作成
- [ ] 質問マスターデータ作成
- [ ] 基本API実装

### Phase 2: UI実装
- [ ] ChatHearingコンポーネント
- [ ] 進捗表示コンポーネント
- [ ] 健康プロフページへの統合

### Phase 3: AI連携
- [ ] Gemini APIとの連携
- [ ] 回答抽出ロジック
- [ ] プロフィール反映ロジック

### Phase 4: 仕上げ
- [x] セッション管理
- [x] エラーハンドリング（デバッグログ追加）
- [ ] テスト・デバッグ

### Phase 5: 外部データ取り込み
- [ ] 外部データソースからの自動取り込み機能
- [ ] 新規データ検知・通知機能
- [ ] 手動コマンド対応

---

## 外部データ取り込み機能

### 概要

健康診断結果やFitbit等のデバイスデータから、健康プロフィールに反映できる情報を自動的に抽出・取り込む機能。

### データソース

| ソース | モデル | 取得できる情報 |
|--------|--------|----------------|
| **HealthRecord** | 健康診断データ | 血圧、体重、血液検査値、所見、医師コメント |
| **FitData** | 日次フィットネスデータ | 心拍数、歩数、睡眠時間、体重 |
| **DetailedSleep** | 詳細睡眠データ | 睡眠時間、睡眠効率、睡眠ステージ |
| **HrvData** | 心拍変動データ | HRV (RMSSD) |
| **Supplement** | サプリメント | 服用中サプリ一覧 |
| **LifestyleHabit** | 生活習慣 | 飲酒、喫煙などの習慣データ |

### データソース→質問マッピング

```typescript
// src/constants/external-data-mapping.ts

export const EXTERNAL_DATA_MAPPING = {
  // HealthRecord (健康診断) からのマッピング
  healthRecord: {
    // 数値データ
    'bloodPressureHigh': { questionId: '1-8', field: '収縮期血圧' },
    'bloodPressureLow': { questionId: '1-8', field: '拡張期血圧' },
    'weight': { questionId: '1-2', field: '体重' },
    'height': { questionId: '1-2', field: '身長' },
    'bmi': { questionId: '1-2', field: 'BMI' },
    'bodyFatPercentage': { questionId: '1-3', field: '体脂肪率' },
    'bloodSugar': { questionId: '3-3', field: '血糖値' },
    'hba1c': { questionId: '3-3', field: 'HbA1c' },
    // テキストデータ（所見・コメント）
    'findings': { questionId: null, type: 'text', target: 'medical_history' },
    'notes': { questionId: null, type: 'text', target: 'medical_history' },
    'sections': { questionId: null, type: 'sections' },
  },

  // FitData からのマッピング
  fitData: {
    'heartRate': { questionId: '1-8', field: '脈拍数' },
    'steps': { questionId: '8-5', field: '歩数' },
    'sleepMinutes': { questionId: '5-1', field: '睡眠時間' },
    'weight': { questionId: '1-2', field: '体重' },
  },

  // DetailedSleep からのマッピング
  detailedSleep: {
    'duration': { questionId: '5-1', field: '睡眠時間' },
    'efficiency': { questionId: '5-3', field: '睡眠効率' },
  },

  // Supplement からのマッピング
  supplement: {
    'list': { questionId: '7-2', field: 'サプリメント一覧' },
  },

  // LifestyleHabit からのマッピング
  lifestyleHabit: {
    'Alcohol': { questionId: '7-3', field: '飲酒' },
    'Tobacco': { questionId: '7-4', field: '喫煙' },
  },
};
```

### 機能フロー

#### 1. セッション開始時の新規データ検知

```
チャット開始（POST /api/health-chat/session）
  │
  ├─ 1. 既存の取り込み履歴を確認（lastImportedAt）
  │
  ├─ 2. 各データソースの最新データを取得
  │     - HealthRecord: 最新の健康診断
  │     - FitData: 直近7日間の平均
  │     - Supplement: 現在のサプリ一覧
  │
  ├─ 3. 前回取り込み以降の新規データがあるか判定
  │
  └─ 4. 新規データがある場合、APIレスポンスに含める
        {
          "hasNewExternalData": true,
          "newDataSummary": {
            "healthRecord": { "date": "2026-01-15", "items": ["血圧", "体重", "所見"] },
            "fitData": { "period": "直近7日", "items": ["平均睡眠時間", "平均歩数"] }
          }
        }
```

#### 2. フロントエンド表示（取り込み確認UI）

```
┌─────────────────────────────────────────────────────────────┐
│  💡 新しいデータがあります                                    │
│                                                             │
│  【健康診断 (2026/01/15)】                                   │
│  ・血圧: 128/82 mmHg (所見: やや高め)                        │
│  ・体重: 72.5kg                                              │
│  ・HbA1c: 5.8%                                              │
│  ・医師コメント: 「血圧が少し高いですね。塩分を...」          │
│                                                             │
│  【Fitbit (直近7日平均)】                                     │
│  ・平均睡眠時間: 6時間32分                                   │
│  ・平均歩数: 7,842歩                                         │
│                                                             │
│  [すべて取り込む]  [選択して取り込む]  [スキップ]             │
└─────────────────────────────────────────────────────────────┘
```

#### 3. データ取り込みAPI

```
POST /api/health-chat/import

Request:
{
  "sources": ["healthRecord", "fitData"],  // 取り込むソース
  "sessionId": "xxx"
}

Response:
{
  "success": true,
  "imported": {
    "questionsAnswered": ["1-2", "1-8", "5-1", "8-5"],
    "profileUpdates": [
      { "sectionId": "basic_attributes", "addedText": "・体重: 72.5kg\n・血圧: 128/82 mmHg" },
      { "sectionId": "medical_history", "addedText": "【2026年1月健診所見】血圧がやや高め..." }
    ]
  },
  "message": "4件の質問に自動回答しました"
}
```

#### 4. 手動コマンド対応

チャット中に以下のフレーズで取り込みを指示可能:

- 「診断データを読み込んで」
- 「健康診断のデータを取り込んで」
- 「Fitbitのデータを反映して」
- 「外部データを取り込んで」

```
User: 診断データを読み込んで

AI: 健康診断データを確認しました。以下の情報を取り込みます：

    【2026年1月15日の健診結果】
    ・血圧: 128/82 mmHg → 質問1-8を回答済みにしました
    ・体重: 72.5kg → 質問1-2を回答済みにしました
    ・所見: 「血圧がやや高め。塩分を控えめに」→ 病歴セクションに追記しました

    合計3件の質問をスキップしました。

    それでは次の質問です。
    直近の体脂肪率、筋肉量、内臓脂肪レベルのデータはありますか？
```

### AI処理フロー

外部データの取り込みはAIを使って柔軟に処理:

```
外部データ（数値 + テキスト）
  │
  ├─ AIに渡すプロンプト:
  │   「以下の健康診断データから、健康プロフィールに
  │     反映すべき情報を抽出してください。
  │     数値だけでなく、所見やコメントも含めてください。」
  │
  ├─ AIが解釈:
  │   - 数値: 対応する質問を回答済みにマーク
  │   - 所見: 該当セクションにテキストとして追記
  │   - コメント: 関連するセクションに追記
  │
  └─ 結果をプロフィールに反映
```

### データベース変更

```sql
-- 外部データ取り込み履歴を追跡するカラムを追加
ALTER TABLE "HealthChatSession" ADD COLUMN "lastExternalDataCheck" TIMESTAMP;
ALTER TABLE "HealthChatSession" ADD COLUMN "lastImportedAt" TIMESTAMP;

-- 質問進捗に取り込み元を記録
ALTER TABLE "HealthQuestionProgress" ADD COLUMN "source" TEXT;
-- source: 'chat' | 'external_healthrecord' | 'external_fitbit' | 'profile_validation'
```

### 新規API

#### POST `/api/health-chat/import`

外部データの取り込み実行

**Request:**
```json
{
  "sessionId": "xxx",
  "sources": ["healthRecord", "fitData", "supplement"],
  "options": {
    "healthRecordId": "specific-record-id",  // 特定のレコードを指定（省略時は最新）
    "fitDataDays": 7  // 何日分の平均を取るか
  }
}
```

**Response:**
```json
{
  "success": true,
  "imported": {
    "questionsAnswered": [
      { "questionId": "1-2", "source": "healthRecord", "value": "体重: 72.5kg" },
      { "questionId": "1-8", "source": "healthRecord", "value": "血圧: 128/82" }
    ],
    "profileUpdates": [
      {
        "sectionId": "basic_attributes",
        "addedText": "【2026年1月健診より】\n・体重: 72.5kg\n・血圧: 128/82 mmHg"
      },
      {
        "sectionId": "medical_history",
        "addedText": "【2026年1月健診所見】\n血圧がやや高め。塩分を控えめに。"
      }
    ],
    "skippedQuestions": ["1-3", "1-5"]  // データがなかった質問
  },
  "summary": "4件の質問に自動回答し、2つのセクションを更新しました"
}
```

#### GET `/api/health-chat/external-data`

取り込み可能な外部データのプレビュー

**Response:**
```json
{
  "hasNewData": true,
  "lastChecked": "2026-02-05T10:00:00Z",
  "available": {
    "healthRecord": {
      "hasNew": true,
      "latestDate": "2026-01-15",
      "preview": {
        "numbers": [
          { "name": "血圧", "value": "128/82 mmHg" },
          { "name": "体重", "value": "72.5kg" }
        ],
        "texts": [
          { "type": "findings", "preview": "血圧がやや高め。塩分を..." }
        ]
      },
      "relatedQuestions": ["1-2", "1-8", "3-3"]
    },
    "fitData": {
      "hasNew": true,
      "period": "2026-01-29 〜 2026-02-05",
      "preview": {
        "avgSleep": "6時間32分",
        "avgSteps": "7,842歩"
      },
      "relatedQuestions": ["5-1", "8-5"]
    }
  }
}
```

### 実装ファイル

```
src/
├── app/
│   └── api/
│       └── health-chat/
│           ├── import/route.ts        # データ取り込みAPI
│           └── external-data/route.ts # 外部データプレビューAPI
├── constants/
│   └── external-data-mapping.ts       # データソース→質問マッピング
├── lib/
│   └── external-data-importer.ts      # 取り込みロジック
└── components/
    └── health-profile/
        └── ExternalDataDialog.tsx     # 取り込み確認UI
```

---

## トラブルシューティング

### AI検証が動作しない場合

1. **サーバーログを確認**
   - `[AI Validation]` で始まるログを確認
   - `GOOGLE_API_KEY not set` が出ていないか確認

2. **プロフィール内容を確認**
   - 対象セクションに10文字以上の内容があるか
   - `categoryId` が質問の `sectionId` と一致しているか

3. **AI応答を確認**
   - `AI response (first 500 chars)` のログでJSONが返っているか
   - `Parsed results` のログで正しく解析されているか

4. **DB状態を確認**
   - `HealthQuestionProgress` テーブルに回答済みレコードが作成されているか

### よくある問題

| 症状 | 原因 | 対処 |
|------|------|------|
| AIが既存情報を無視して質問する | AI検証が失敗している | サーバーログを確認 |
| セッション開始が遅い | AI検証に時間がかかっている | 正常動作（数秒待つ） |
| 進捗が0%のまま | `HealthQuestionProgress` が更新されていない | DB接続を確認 |
