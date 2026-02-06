# 健康プロフィール AIチャット v2 アーキテクチャ設計

## v1からの変更点（サマリー）

v1（CHAT_HEARING_SPEC.md）は固定質問リスト＋進捗管理方式。v2では以下に刷新:

- 固定質問リスト → AIが自律的に対話
- HealthQuestionProgress テーブル不要
- Google Docsを Single Source of Truth として活用
- ストリーミング応答（SSE）対応
- 健康データの分析・アドバイス機能を追加
- 動的ウェルカムメッセージ（データ状態検出）
- FAQ/使い方サポート機能を内蔵

---

## アーキテクチャ: "Google Docs Truth Source" モデル

### 核心的な変更

**Google Docsを「信頼できる唯一の情報源（Single Source of Truth）」として扱う**

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Docs                              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ 健康プロフィール  │  │   診断記録       │                   │
│  │ (HEALTH_PROFILE) │  │   (RECORDS)      │                   │
│  └─────────────────┘  └─────────────────┘                   │
│            ↓                    ↓                            │
│         READ (チャット開始時 / 手動同期時)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 AIチャットエンジン                           │
│                                                             │
│  1. プロフィール全文をコンテキストに含める                    │
│  2. AIが自律的に「何が不足か」を判断                         │
│  3. 構造化出力で精密なプロフィール更新                       │
│  4. 重複検出・解決をAIが実行                                 │
│  5. 健康データの分析・アドバイスを提供                       │
│  6. Health Hubの使い方をFAQ情報から回答                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 プロフィール更新                              │
│                                                             │
│  1. DB更新 (Prisma)                                         │
│  2. Google Docs同期 (非同期)                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## AIの3つの役割

### 1. プロフィールの構築・改善
- ユーザーとの対話から健康情報を聞き取り
- 適切なセクション（11カテゴリ）に情報を追加・更新・削除
- 重複・矛盾・古い情報の検出と解決提案

### 2. 健康データの分析・アドバイス
- プロフィールや診断記録データを読み取り、傾向や気になる点を指摘
- 数値の経年変化や基準値との比較
- 生活改善のアドバイスを提供

### 3. Health Hubの使い方サポート
- システムプロンプトに埋め込まれたFAQ情報をもとに回答
- 連携設定などは該当する設定ページへ誘導（チャット内で完結させない）
- `/help` ページも別途用意

---

## セッション管理とウェルカムメッセージ

### データ状態検出

セッション開始時（`GET /api/health-chat/v2/session`）に以下を並列取得:

```typescript
interface DataStatus {
    profileFilledCount: number;      // 入力済みプロフィールセクション数
    profileTotalCount: number;       // 全セクション数（11）
    missingSectionNames: string[];   // 未入力セクション名リスト
    hasRecords: boolean;             // 診断記録の有無
    hasFitbit: boolean;              // Fitbit連携の有無
    hasGoogleDocs: boolean;          // Google Docs連携の有無
}
```

### 動的ウェルカムメッセージ

ユーザーのデータ状態に応じて、以下の構成で番号付き選択肢を動的生成:

**固定ブロック（常に表示）:**
- あいさつ
- ①健康プロフィールの作成・更新
- ②健康データの分析・アドバイス
- ③Health Hubの使い方サポート

**データ不足ブロック（条件付き表示）:**
- 健康診断記録なし → 「④健康診断・医療データについて教える」
- プロフィール未入力あり → 「⑤健康プロフィールを充実させる」

**連携未設定ブロック（条件付き表示）:**
- Fitbit未連携 → 「⑥スマートウォッチ・スマホとの連携」
- Google Docs未連携 → 「⑦Gemini・ChatGPTへの健康データ連携」

### セッション再開

既存セッション（メッセージあり）を再開する場合:
```
お帰りなさい！

前回の続きから再開しますか？それとも別のことをしますか？

１．前回の続きから
２．別のことをする
```

### 番号選択への対応

- 半角「1」、全角「１」、対応する言葉のいずれでも受け付け
- システムプロンプトに番号→トピックのマッピングを記載

---

## システムプロンプト設計

### コンテキスト構築

チャット開始時に以下を取得（Google Docs同期は手動ボタンで実行）:
- Google Docsから健康プロフィール全文（READ）
- Google Docsから診断記録全文（READ）

### システムプロンプト構成

```markdown
あなたはHealth Hubの健康プロフィール構築・改善・分析を支援するAIアシスタントです。

## あなたが持っている情報

### 現在の健康プロフィール（Google Docsから読み込み）
{PROFILE_CONTENT}

### 診断記録データ（Google Docsから読み込み）
{RECORDS_CONTENT（最大8000文字）}

## 利用可能なセクションID
  basic_attributes（1. 基本属性・バイオメトリクス）
  genetics（2. 遺伝・家族歴）
  ...全11セクション

## あなたの役割

1. **プロフィールの構築・改善**: ユーザーとの対話から健康情報を聞き取り、プロフィールに追加・更新・削除する
2. **健康データの分析・アドバイス**: プロフィールや診断記録データを読み取り、傾向の指摘・生活改善のアドバイスを提供する
3. **Health Hubの使い方サポート**: FAQ情報をもとにアプリの機能や使い方について回答する
4. **自然な対話**: ユーザーの話の流れに沿って深掘りし、適切なタイミングで関連質問をする

## ウェルカムメッセージの番号選択への対応

（ユーザーが数字や言葉で選択肢を選べるように対応）

## 設定ページへの誘導

連携や設定に関する質問には、チャット内で設定を完結させず設定ページへ誘導:
- Fitbit連携 → /settings/fitbit
- Google Docs連携 → /settings/google-docs
- スマホデータ連携 → /settings/data-sync
- 検査項目の設定 → /profile/settings/items

## Health Hub FAQ情報

（主な機能、データ連携、データ入力方法を記載）

## 重要なルール

1. 既存情報の尊重: プロフィールに既に書いてあることは再度質問しない
2. 確認が必要: confidence < 0.8 の更新は実行前に確認を求める
3. 削除は慎重に: confidence 0.95以上でないと自動実行しない
4. 必ず質問を含める: 終了希望以外は必ず1つ質問を含める

## 出力形式

応答テキストの後に、PROFILE_ACTION JSONブロックを出力
```

---

## API設計

### GET /api/health-chat/v2/session

セッション取得/新規作成（高速・楽観的）

**レスポンス:**
```json
{
  "success": true,
  "sessionId": "uuid",
  "status": "active",
  "welcomeMessage": "（動的生成されたウェルカムメッセージ）",
  "messages": [],
  "context": {
    "hasProfile": true,
    "hasRecords": false,
    "profileSummary": "5/11セクション入力済み",
    "synced": false
  }
}
```

### POST /api/health-chat/v2/session

Google Docsデータを手動同期

### DELETE /api/health-chat/v2/session

セッションをクリア（新規セッション開始用）

### POST /api/health-chat/v2/stream

**ストリーミング応答（メインAPI）**

Server-Sent Events (SSE) を使用してリアルタイムで応答を返す。

**リクエスト:**
```json
{
  "message": "ユーザーのメッセージ",
  "sessionId": "セッションID"
}
```

**処理フロー:**
1. 認証チェック・レート制限
2. Google Docsからコンテキスト読み込み
3. 会話履歴取得（最大20件、超過分はサマリー化）
4. Gemini 2.0 Flash にストリーミングリクエスト
5. SSEでリアルタイム応答（PROFILE_ACTIONブロックはフィルタリング）
6. 応答完了後、PROFILE_ACTIONを解析
7. confidence ≥ 0.8 のアクションを自動実行（DELETEは 0.95以上）
8. 低confidence のアクションはpendingActionsとして返却
9. メッセージ保存・Google Docs同期

**SSEデータ形式:**
```
data: {"text": "応答テキストの一部"}
data: {"text": "続きのテキスト..."}
...
data: {"done": true, "executedActions": [...], "pendingActions": [...]}
```

### POST /api/health-chat/v2

**非ストリーミング応答（フォールバック）**

ストリーミングと同じ処理を同期的に実行し、JSON一括レスポンスを返す。

---

## 構造化出力

### PROFILE_ACTION フォーマット

```
<!--PROFILE_ACTION
{
  "actions": [
    {
      "type": "ADD" | "UPDATE" | "DELETE" | "NONE",
      "section_id": "セクションID",
      "target_text": "更新/削除対象テキスト",
      "new_text": "追加/更新後テキスト",
      "reason": "変更理由",
      "confidence": 0.0-1.0
    }
  ],
  "detected_issues": [
    {
      "type": "DUPLICATE" | "CONFLICT" | "OUTDATED" | "MISSING",
      "description": "問題の説明",
      "suggested_resolution": "解決案"
    }
  ],
  "follow_up_topic": "次に聞くと良いトピック"
}
PROFILE_ACTION-->
```

### ストリーミング時のPROFILE_ACTIONフィルタリング

SSEストリーミング中、PROFILE_ACTIONブロックがチャンク境界で分割される問題に対応:
- `insideProfileAction` フラグで状態管理
- `pendingBuffer` で部分的な `<!--` マーカーを保持
- チャンク単位の正規表現ではなく、ステートマシン方式で確実にフィルタリング

---

## セキュリティ対策

### レート制限
- インメモリ実装（本番はRedis推奨）
- 1分間に20リクエストまで

### プロンプトインジェクション対策
```typescript
function sanitizeUserInput(input: string): string {
    return input
        .replace(/<!--[\s\S]*?-->/g, '')        // HTMLコメント
        .replace(/PROFILE_ACTION/gi, '')         // 特殊マーカー
        .replace(/EXTRACTED_DATA/gi, '')
        .replace(/システムプロンプト/gi, '')
        .replace(/system\s*prompt/gi, '')
        .replace(/ignore\s*(all|previous)\s*(instructions?)?/gi, '')
        .trim();
}
```

### その他
- Google Docs APIの認証はサービスアカウント経由（既存）
- ユーザーごとのデータ分離はDB側で担保
- センシティブデータのログ出力は最小限
- 医療免責事項はGemini自体のポリシーに委任

---

## 実装ファイル構成

```
src/
├── app/
│   ├── api/
│   │   └── health-chat/
│   │       └── v2/
│   │           ├── route.ts           # 非ストリーミングAPI
│   │           ├── stream/route.ts    # ストリーミングAPI（メイン）
│   │           └── session/route.ts   # セッション管理API
│   ├── help/
│   │   └── page.tsx                   # FAQ/ヘルプページ
│   └── health-profile/
│       └── page.tsx                   # 健康プロフページ
├── components/
│   └── health-profile/
│       └── ChatHearingV2.tsx          # チャットUIコンポーネント
├── constants/
│   └── health-profile.ts             # 11カテゴリ定義
└── lib/
    ├── google-docs.ts                 # Google Docs読み書き
    └── prisma.ts                      # Prismaクライアント
```

---

## データベース設計（v2で使用）

### HealthChatSession
```
id: UUID
userId: UUID (FK → User)
status: 'active' | 'paused' | 'completed'
currentPriority: Int
createdAt: DateTime
updatedAt: DateTime
```

### HealthChatMessage
```
id: UUID
sessionId: UUID (FK → HealthChatSession)
role: 'user' | 'assistant'
content: Text
createdAt: DateTime
```

---

## 移行計画

### Phase 1: 基盤 ✅
1. Google Docsからの読み取り機能
2. 新しいシステムプロンプト
3. 構造化出力（PROFILE_ACTION）の解析
4. 基本的なアクション実行（ADD/UPDATE/DELETE）
5. ストリーミング応答（SSE）

### Phase 2: UX改善 ✅
1. 動的ウェルカムメッセージ（データ状態検出）
2. 番号選択対応
3. 健康データの分析・アドバイス機能
4. FAQ/使い方サポート機能（システムプロンプト内蔵 + /help ページ）
5. 設定ページへの誘導
6. セッション再開フロー

### Phase 3: 改善（次回以降）
1. コンテキストキャッシング最適化
2. 重複検出アルゴリズムの精緻化
3. ユーザーフィードバックループ

### Phase 4: 高度化（将来）
1. Gemini 2.5への移行
2. 外部データの自動統合
3. 予測的な健康提案

---

## 期待される改善効果

| 問題 | v1 | v2 |
|------|-----|-----|
| 重複質問 | 頻発 | プロフィール全文を参照するため発生しない |
| 重複情報 | 放置 | AI が検出して解決を提案 |
| 古い情報 | 放置 | 診断記録と比較して検出 |
| 固定質問 | 硬直的 | AI が状況に応じて柔軟に対話 |
| コンテキスト | 断片的 | 全情報を把握して回答 |
| 健康分析 | なし | データに基づく分析・アドバイス |
| 使い方サポート | なし | FAQ情報をもとにチャット内で回答 |
| リアルタイム性 | 一括応答 | SSEストリーミング |
| ウェルカム | 固定 | データ状態に応じて動的生成 |
