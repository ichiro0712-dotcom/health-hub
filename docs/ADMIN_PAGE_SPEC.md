# 管理ページ 仕様書

## 概要

Health Hub の管理者向け管理ページ。AI チャット・スコア分析のプロンプト編集、ヘルスデータの名寄せ管理、ユーザー統計、バグ検知をコード変更なしで運用可能にする。

**URL**: `/admin`
**認証**: `ADMIN_EMAILS` 環境変数に登録されたメールアドレスのみアクセス可能（既存パターン踏襲）

---

## アーキテクチャ方針

### プロンプトの DB 化

現在ハードコードされているプロンプト・設定を DB テーブル `AdminPrompt` に格納し、API 側はまず DB を参照 → 存在しなければコード上のデフォルト値にフォールバックする。

```
[管理画面] → [AdminPrompt テーブル] → [API/Agent がリクエスト時に読み込み]
                                        ↓ (DBに値がない場合)
                                   [コード上のデフォルト値]
```

### 即座反映の仕組み

- 管理画面で保存 → DB に即時書き込み
- 各 API/Agent はリクエストごとに DB から最新プロンプトを取得
- キャッシュは使わない（頻繁なアクセスではないため）

---

## DB スキーマ追加

```prisma
// ============================================
// 管理ページ用モデル
// ============================================

// プロンプト・設定の管理テーブル
model AdminPrompt {
  id          String   @id @default(cuid())
  key         String   @unique  // 一意識別キー（例: "chat.hearing_agent.system_prompt"）
  category    String              // カテゴリ（例: "chat", "score", "mode_detection"）
  label       String              // 管理画面上の表示名
  description String?  @db.Text   // 説明文（管理者向け）
  value       String   @db.Text   // プロンプト本文またはJSON設定値
  valueType   String   @default("text")  // "text" | "json" | "number"
  isActive    Boolean  @default(true)     // 無効化フラグ
  updatedBy   String?             // 最終更新者のメールアドレス
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([category])
}

// ヘルスデータ項目の管理テーブル（health-items.ts を DB 化）
model AdminHealthItem {
  id          String   @id @default(cuid())
  itemName    String   @unique   // "AST(GOT)" 等
  displayName String?            // サイト上の表示名（nullなら itemName をそのまま使う）
  minVal      Float
  maxVal      Float
  safeMin     Float?
  safeMax     Float?
  tags        String[]
  description String?  @db.Text
  orderIndex  Int      @default(0)
  isActive    Boolean  @default(true)
  updatedBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// 質問マスター管理テーブル（health-questions.ts を DB 化）
model AdminHealthQuestion {
  id               String   @id @default(cuid())
  questionId       String   @unique  // "1-1", "2-3" 等
  sectionId        String             // "basic_attributes" 等
  priority         Int                // 1, 2, 3
  question         String   @db.Text  // 質問文
  intent           String   @db.Text  // 質問の意図
  extractionHints  String[]           // 抽出ヒント
  isActive         Boolean  @default(true)
  orderIndex       Int      @default(0)
  updatedBy        String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([sectionId])
  @@index([priority])
}

// バグ検知・エラーログテーブル
model AdminErrorLog {
  id          String   @id @default(cuid())
  level       String              // "error" | "warning" | "info"
  category    String              // "llm_parse_fail" | "api_error" | "timeout" | "anomaly"
  message     String   @db.Text
  metadata    Json?               // リクエスト情報、スタックトレース等
  userId      String?             // 関連ユーザー（いれば）
  endpoint    String?             // エラー発生エンドポイント
  resolved    Boolean  @default(false)
  resolvedAt  DateTime?
  resolvedBy  String?
  createdAt   DateTime @default(now())

  @@index([category])
  @@index([level])
  @@index([createdAt])
  @@index([resolved])
}
```

---

## 機能詳細

### A. AI チャットチューニング（`/admin/chat`）

#### A-1. プロンプト管理（`/admin/chat/prompts`）

DB化対象のプロンプト一覧:

| key | 現在の場所 | 内容 |
|-----|-----------|------|
| `chat.base_prompt` | `chat-prompts.ts:159` buildBasePrompt() | 全モード共通のベースプロンプト（H-Hubアシスタント紹介、番号選択対応、設定ページ誘導） |
| `chat.mode_transition` | `chat-prompts.ts:187` buildModeTransitionInstructions() | モード遷移時の指示（脱線対応、MODE_SWITCH出力ルール） |
| `chat.profile_building` | `chat-prompts.ts:210` buildProfileBuildingPrompt() | プロフィール構築モード全体プロンプト（フォールバック用） |
| `chat.data_analysis` | `chat-prompts.ts:560` buildDataAnalysisPrompt() | データ分析モードプロンプト |
| `chat.help` | `chat-prompts.ts:588` buildHelpPrompt() | 使い方サポートモードプロンプト（FAQ情報含む） |
| `chat.hearing_agent` | `hearing-agent.ts:15` buildHearingSystemPrompt() | ヒアリングエージェント システムプロンプト |
| `chat.profile_analyzer` | `profile-analyzer.ts` | プロフィール分析エージェント プロンプト |
| `chat.profile_editor` | `profile-editor.ts:83` callEditorAI() | プロフィール編集エージェント プロンプト |

**UI要件**:
- プロンプト一覧をカード形式で表示（key, label, 更新日時, 更新者）
- クリックで編集モーダル/ページを開く
- テキストエリアでの編集（シンタックスハイライトなし、プレーンテキスト）
- プレースホルダー変数の説明表示（例: `${profileContent}` → 「現在の健康プロフィール内容が挿入されます」）
- 保存ボタンで即座に DB 反映
- 「デフォルトに戻す」ボタン（DB レコード削除 → コードのデフォルト値にフォールバック）

#### A-2. モード検出キーワード管理（`/admin/chat/mode-detection`）

DB化対象:

| key | 内容 |
|-----|------|
| `chat.mode_detection_rules` | JSON形式。モード検出ルール一覧 |

**現在の構造**（`chat-prompts.ts:71-114` detectMode()）:
```json
{
  "rules": [
    {
      "id": "explicit_1",
      "pattern": "^[1１]$|プロフィール",
      "mode": "profile_building",
      "confidence": 1.0,
      "label": "明示的選択: プロフィール"
    },
    {
      "id": "explicit_2",
      "pattern": "^[2２]$|分析|アドバイス",
      "mode": "data_analysis",
      "confidence": 1.0,
      "label": "明示的選択: データ分析"
    },
    {
      "id": "explicit_3",
      "pattern": "^[3３]$|使い方|ヘルプ",
      "mode": "help",
      "confidence": 1.0,
      "label": "明示的選択: ヘルプ"
    },
    {
      "id": "auto_profile",
      "pattern": "おまかせ|お任せ|始め|お願い|やって|進めて",
      "mode": "profile_building",
      "confidence": 0.9,
      "label": "自動: おまかせ系"
    }
  ],
  "defaultMode": "profile_building",
  "defaultConfidence": 0.5
}
```

**UI要件**:
- ルール一覧テーブル（パターン、マッチ先モード、confidence、ラベル）
- 行の追加・編集・削除
- ドラッグ&ドロップで優先順序変更（上から順にマッチ）
- 正規表現のバリデーション（保存時にRegExpとしてパースできるか確認）

#### A-3. グリーティング・定型応答管理（`/admin/chat/greetings`）

DB化対象:

| key | 内容 |
|-----|------|
| `chat.greeting_new_user` | 新規ユーザーへのウェルカムメッセージ |
| `chat.greeting_returning_user` | 既存ユーザーへのウェルカムメッセージ |
| `chat.greeting_profile_complete` | プロフィール完成ユーザーへの3択メッセージ |
| `chat.session_end_message` | セッション終了時のメッセージ |

**UI要件**:
- 各メッセージのテキストエリア編集
- プレビュー表示（チャットバブル風にどう見えるか）

#### A-4. 質問マスター管理（`/admin/chat/questions`）

`AdminHealthQuestion` テーブルを使用。初回は `health-questions.ts` から seed する。

**UI要件**:
- セクション別のアコーディオン表示
- 各質問: 質問文、intent、extractionHints、priority のインライン編集
- 質問の有効/無効切り替え（isActive トグル）
- 新規質問の追加フォーム
- priority でのフィルタリング（1/2/3）
- セクション内の並び替え

#### A-5. Confidence 閾値設定（`/admin/chat/thresholds`）

DB化対象:

| key | 現在の値 | 内容 |
|-----|---------|------|
| `chat.confidence_threshold_default` | 0.8 | プロフィール更新の確認なし実行閾値 |
| `chat.confidence_threshold_delete` | 0.95 | プロフィール削除の自動実行閾値 |
| `chat.max_history_messages` | 20 | 会話履歴の最大保持数 |

**UI要件**:
- スライダー + 数値入力
- 変更時に警告（「閾値を下げると誤ったプロフィール更新が増える可能性があります」）

---

### B. スコアチューニング（`/admin/score`）

#### B-1. 分析プロンプト管理（`/admin/score/analysis`）

DB化対象:

| key | 現在の場所 | 内容 |
|-----|-----------|------|
| `score.analysis_prompt` | `api/report/analyze/route.ts:163` buildAnalysisPrompt() | スコア算出用プロンプト（カテゴリ定義・採点基準含む） |
| `score.advice_prompt` | `api/report/analyze/route.ts:272` buildAdvicePrompt() | アドバイス生成用プロンプト |
| `score.analysis_prompt_v2` | `actions/analyze-health.ts:147` | Server Action版の統合プロンプト |

**UI要件**:
- 各プロンプトのテキストエリア編集（大きめ、リサイズ可能）
- プレースホルダー変数一覧の表示
- 「API版」「Server Action版」のタブ切り替え

#### B-2. スコアカテゴリ管理（`/admin/score/categories`）

DB化対象:

| key | 内容 |
|-----|------|
| `score.health_categories` | JSON形式。11カテゴリの定義 |

```json
[
  { "id": "risk_factors", "name": "リスク因子", "rank": "SS", "avgScore": 50, "description": "がん、心疾患、脳卒中など..." },
  { "id": "diet_nutrition", "name": "食習慣・栄養", "rank": "SS", "avgScore": 50, "description": "身体を構成する材料の供給..." }
]
```

**UI要件**:
- カテゴリ一覧テーブル（ID、名前、ランク、平均スコア、説明）
- インライン編集
- ランクのセレクトボックス（SS/S/A/B/C）
- 新規カテゴリ追加、既存カテゴリ無効化

---

### C. ヘルスデータ DB チューニング（`/admin/health-data`）

#### C-1. MasterItem 管理（`/admin/health-data/master-items`）

既存の `MasterItem` テーブルを直接操作。

**UI要件**:
- 一覧テーブル（code, standardName, jlac10, synonyms数, 紐付きユーザー項目数）
- 検索/フィルター（コード、名称、synonymsで検索）
- 各項目の編集:
  - standardName（正式名称）の編集
  - jlac10 コードの編集
  - synonyms のタグ入力（チップ形式で追加/削除）
- 新規 MasterItem の追加

#### C-2. 表示名・安全範囲管理（`/admin/health-data/display-settings`）

`AdminHealthItem` テーブルを使用。初回は `health-items.ts` の `DEFAULT_ITEM_SETTINGS` から seed する。

**UI要件**:
- 一覧テーブル（項目名、表示名、safeMin、safeMax、minVal、maxVal、タグ、説明）
- インライン編集
- safeMin/safeMax の数値入力（バリデーション: safeMin < safeMax）
- tags のタグ入力
- description のテキストエリア
- 項目の有効/無効切り替え
- カテゴリ別フィルター（liver, lipid, glucose, kidney 等）

---

### D. ユーザー管理・統計（`/admin/users`）

#### D-1. ユーザー一覧（`/admin/users`）

**データソース**: 既存の `User` テーブル + 各リレーション

**UI要件**:
- ユーザー一覧テーブル:
  - 名前、メール、登録日
  - 連携状況アイコン（Fitbit、Health Connect、Google Docs）
  - プロフィール完成度（回答済み質問数 / 全質問数）
  - 最終チャット日時
- 検索（名前、メール）
- ソート（登録日、最終アクティブ日）

#### D-2. ユーザー詳細（`/admin/users/[id]`）

**UI要件**:
- 基本情報（名前、メール、年齢、登録日）
- 連携状況:
  - Fitbit: 接続有無、最終同期日時、スコープ
  - Google Docs: 接続有無、ドキュメントID
  - Health Connect: 最終同期日時
- 機能利用統計:
  - チャットセッション数（profile_building / data_analysis / help 別）
  - 総メッセージ数
  - レポート生成回数（HealthRecord count）
  - 習慣トラッキング（Habit 数、HabitRecord 総数）
  - サプリメント登録数
  - 検査項目数
- プロフィール完成度（セクション別の入力済み/未入力）

#### D-3. 全体統計ダッシュボード（`/admin/users/stats`）

**UI要件**:
- 総ユーザー数
- アクティブユーザー数（過去7日/30日）
- 連携率（Fitbit / Google Docs / Health Connect）
- 機能別利用率（チャット、レポート、習慣トラッキング）
- 質問回答率の分布

---

### E. バグ検知ダッシュボード（`/admin/bugs`）

#### E-1. エラーログ収集

**収集対象**:

| カテゴリ | 検知条件 | 重要度 |
|---------|---------|--------|
| `llm_parse_fail` | EXTRACTED_DATA / ISSUE_DECISION / PROFILE_ACTION の JSON パース失敗 | error |
| `llm_empty_response` | LLM からの空レスポンス | error |
| `api_error` | API エンドポイントの 5xx エラー | error |
| `api_timeout` | API リクエストのタイムアウト | warning |
| `fitbit_sync_fail` | Fitbit 同期の失敗 | warning |
| `score_analysis_fail` | スコア分析の失敗 | error |
| `ocr_parse_fail` | 健康診断OCRの読み取り失敗 | warning |
| `anomaly_high_error_rate` | 直近1時間のエラー率が閾値超過 | error |

**収集方法**:
- 各 API ルートの catch ブロックで `AdminErrorLog` に書き込み
- ユーティリティ関数 `logAdminError(level, category, message, metadata?)` を提供

#### E-2. ダッシュボード UI（`/admin/bugs`）

**UI要件**:
- 直近24時間のエラー件数サマリー（カテゴリ別）
- エラーの時系列グラフ（棒グラフ、1時間単位）
- エラーログ一覧テーブル:
  - 日時、レベル（error/warning）、カテゴリ、メッセージ、ユーザー、エンドポイント
  - フィルター: レベル、カテゴリ、期間、解決済み/未解決
- エラー詳細モーダル（metadata の JSON 表示）
- 「解決済み」マーク機能
- 異常検知アラートバナー（未解決の error レベルが5件以上で表示）

---

## ページ構成

```
/admin                          ← ダッシュボード（概要）
├── /admin/chat                 ← AIチャットチューニング
│   ├── /admin/chat/prompts     ← プロンプト管理
│   ├── /admin/chat/mode-detection ← モード検出キーワード
│   ├── /admin/chat/greetings   ← グリーティング・定型応答
│   ├── /admin/chat/questions   ← 質問マスター管理
│   └── /admin/chat/thresholds  ← Confidence閾値設定
├── /admin/score                ← スコアチューニング
│   ├── /admin/score/analysis   ← 分析プロンプト管理
│   └── /admin/score/categories ← カテゴリ管理
├── /admin/health-data          ← ヘルスデータDBチューニング
│   ├── /admin/health-data/master-items    ← MasterItem管理
│   └── /admin/health-data/display-settings ← 表示名・安全範囲管理
├── /admin/users                ← ユーザー管理
│   ├── /admin/users            ← ユーザー一覧
│   ├── /admin/users/[id]       ← ユーザー詳細
│   └── /admin/users/stats      ← 全体統計
└── /admin/bugs                 ← バグ検知ダッシュボード
```

---

## API ルート構成

```
/api/admin/
├── prompts/
│   ├── route.ts          GET（一覧）、POST（新規作成）
│   └── [id]/route.ts     GET（詳細）、PUT（更新）、DELETE（削除）
├── health-items/
│   ├── route.ts          GET（一覧）、POST（新規作成）
│   └── [id]/route.ts     PUT（更新）、DELETE（削除）
├── health-questions/
│   ├── route.ts          GET（一覧）、POST（新規作成）
│   └── [id]/route.ts     PUT（更新）、DELETE（削除）
├── master-items/
│   ├── route.ts          GET（一覧）、POST（新規作成）
│   └── [code]/route.ts   PUT（更新）、DELETE（削除）
├── users/
│   ├── route.ts          GET（ユーザー一覧 + 統計サマリー）
│   ├── [id]/route.ts     GET（ユーザー詳細 + 利用統計）
│   └── stats/route.ts    GET（全体統計）
├── errors/
│   ├── route.ts          GET（エラーログ一覧）、POST（エラー記録用内部API）
│   ├── [id]/route.ts     PUT（解決済みマーク）
│   └── stats/route.ts    GET（エラー統計）
├── seed/
│   └── route.ts          POST（初期データ投入: prompts, health-items, questions）
└── backup/               （既存）
    ├── export/route.ts
    ├── import/route.ts
    └── status/route.ts
```

**全APIルート共通**:
- セッション認証チェック
- ADMIN_EMAILS によるアクセス権限チェック
- エラー時は AdminErrorLog に記録

---

## 実装の進め方

### フェーズ 1: 基盤（DB + API + 認証）
1. Prisma スキーマに新モデル追加 & マイグレーション
2. 管理者認証ミドルウェア作成
3. Seed スクリプト作成（現在のハードコード値をDBに投入）
4. `getAdminPrompt(key, defaultValue)` ユーティリティ作成

### フェーズ 2: AI チャットチューニング
5. プロンプト管理 API + UI
6. 既存コードのリファクタ（DB から読み込むように変更）
7. モード検出キーワード管理
8. グリーティング管理
9. 質問マスター管理
10. Confidence 閾値設定

### フェーズ 3: スコアチューニング
11. スコア分析プロンプト管理 API + UI
12. 既存コードのリファクタ
13. カテゴリ管理

### フェーズ 4: ヘルスデータ DB チューニング
14. MasterItem 管理 UI（既存テーブル活用）
15. 表示名・安全範囲管理（AdminHealthItem seed + UI）

### フェーズ 5: ユーザー管理・統計
16. ユーザー一覧・詳細 API + UI
17. 全体統計ダッシュボード

### フェーズ 6: バグ検知
18. AdminErrorLog 収集ユーティリティ
19. 既存 API ルートにエラーログ収集を組み込み
20. バグ検知ダッシュボード UI

---

## UI デザイン方針

- 既存の TailwindCSS + teal カラーパレットを踏襲
- Lucide React アイコン使用
- サイドバーナビゲーション（管理ページ専用）
- レスポンシブ（ただし管理ページは PC 前提でモバイルは最低限）
- フローティングメニューに管理者のみ表示の「管理ページ」リンク追加

---

## プロンプト読み込みユーティリティの設計

```typescript
// src/lib/admin-prompt.ts

/**
 * DBからプロンプトを取得。存在しなければデフォルト値を返す。
 * API/Agent のリクエスト時に毎回呼び出される。
 */
export async function getAdminPrompt(key: string, defaultValue: string): Promise<string> {
  const record = await prisma.adminPrompt.findUnique({
    where: { key },
  });
  if (record && record.isActive) {
    return record.value;
  }
  return defaultValue;
}

/**
 * JSON 形式の設定値を取得
 */
export async function getAdminConfig<T>(key: string, defaultValue: T): Promise<T> {
  const record = await prisma.adminPrompt.findUnique({
    where: { key },
  });
  if (record && record.isActive) {
    return JSON.parse(record.value) as T;
  }
  return defaultValue;
}
```

---

## エラーログ収集ユーティリティの設計

```typescript
// src/lib/admin-error-log.ts

export async function logAdminError(
  level: 'error' | 'warning' | 'info',
  category: string,
  message: string,
  metadata?: {
    userId?: string;
    endpoint?: string;
    stack?: string;
    requestBody?: any;
    responseBody?: any;
  }
): Promise<void> {
  try {
    await prisma.adminErrorLog.create({
      data: {
        level,
        category,
        message,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        userId: metadata?.userId,
        endpoint: metadata?.endpoint,
      },
    });
  } catch (e) {
    // エラーログ記録自体の失敗は console.error に留める
    console.error('[AdminErrorLog] Failed to log:', e);
  }
}
```

---

## Seed スクリプトの方針

初回実行時に以下を DB に投入:

1. **AdminPrompt**: 全プロンプト（chat-prompts.ts, agents, report/analyze 等のデフォルト値）
2. **AdminHealthItem**: `DEFAULT_ITEM_SETTINGS` の全58項目
3. **AdminHealthQuestion**: `HEALTH_QUESTIONS` の全60問超

Seed は冪等（既に存在するレコードはスキップ）とし、`/api/admin/seed` エンドポイントまたは `npx prisma db seed` で実行可能にする。
