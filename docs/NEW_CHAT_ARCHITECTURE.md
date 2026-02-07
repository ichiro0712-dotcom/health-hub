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

### v2.1: 3エージェントパイプライン化

v2の単一LLM呼び出しを**3つの役割特化AI**に分離:

- 1つのLLMに全ルール（プロフィール全文 + 169問ガイド + 重複検出 + 会話 + 編集ルール）を詰め込む方式を廃止
- プロフィール未完成時の番号選択メニューを廃止、即質問開始に変更
- 重複・矛盾検出を専用AIで確実に実行

---

## アーキテクチャ: 3エージェントパイプライン

### 核心的な設計

**Google Docsを「信頼できる唯一の情報源（Single Source of Truth）」として扱い、プロフィール構築時は3つの役割特化AIがパイプラインで処理する**

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
│          Stage 1: Profile Analyzer（セッション開始時）       │
│  - プロフィール全文を分析                                    │
│  - 重複・矛盾・古い情報を検出                               │
│  - 未入力の質問リストをpriority順で生成                      │
│  - Temperature: 0.1、JSON出力のみ、1回だけ実行               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│          Stage 2: Hearing AI（ユーザーとの対話）              │
│  - 現在の質問1つ + 該当セクションの既存情報のみ使用           │
│  - プロンプト ~800-1000トークン（従来の3000-5000から削減）    │
│  - 会話テキスト + <!--EXTRACTED_DATA-->で抽出情報を返す       │
│  - Temperature: 0.4、ストリーミング対応                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│          Stage 3: Profile Editor（バックグラウンド）          │
│  - Hearing AIの抽出結果を受け取り                            │
│  - ADD vs UPDATE の判定に特化（重複防止）                    │
│  - PROFILE_ACTION JSONを生成                                 │
│  - Temperature: 0.1、ストリーミング不要                      │
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

**data_analysis / help モードは従来の単一LLM方式を継続**（3エージェント化はprofile_buildingモードのみ）

---

## チャットの3つのモード

### 1. プロフィールの構築・改善（profile_building）
- **3エージェントパイプライン**で処理
- Profile Analyzerが重複・矛盾を検出し、未入力質問をリストアップ
- Hearing AIが1問ずつ集中してユーザーから情報を聞き取り
- Profile Editorが抽出結果からADD/UPDATEアクションを生成
- プロフィール未完成時はセッション開始と同時にprofile_buildingモードに自動設定

### 2. 健康データの分析・アドバイス（data_analysis）
- プロフィールや診断記録データを読み取り、傾向や気になる点を指摘
- 数値の経年変化や基準値との比較
- 生活改善のアドバイスを提供

### 3. Health Hubの使い方サポート（help）
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

ユーザーのデータ状態に応じて、フローを分岐:

**プロフィール未完成時（メニューなし・即開始）:**
- Profile Analyzerを実行し、重複・矛盾の検出 + 未入力質問リストアップ
- ウェルカムメッセージ + 最初の質問を即表示
- 番号選択なしで自動的にprofile_buildingモードで開始
```
こんにちは！H-Hubアシスタントです。

プロフィールの内容を確認して、足りないところから質問を進めさせてもらいますね。
途中で辞めたいときは「ここまで保存して」と言ってください。

「1. 基本属性・バイオメトリクス」について聞かせてください。

お名前（ニックネームでもOK）と、性別、年齢を教えていただけますか？
```

**プロフィール完成済み（シンプルな3択）:**
```
こんにちは！H-Hubアシスタントです。

健康プロフィールは充実しています！何をお手伝いしますか？

１．健康プロフィールの更新
２．健康データの分析・アドバイス
３．使い方サポート
```

### セッション再開

既存セッション（メッセージあり）を再開する場合:
```
お帰りなさい！前回の続きから再開しますね。
```

### 番号選択への対応

- プロフィール完成済みの3択メニュー表示時のみ関係
- 半角「1」、全角「１」、対応する言葉のいずれでも受け付け
- システムプロンプトに番号→トピックのマッピングを記載

---

## システムプロンプト設計

### profile_buildingモード: 3エージェントパイプライン

profile_buildingモードでは、従来の単一プロンプトに代えて3つの役割特化AIがそれぞれコンパクトなプロンプトで動作する。

#### Stage 1: Profile Analyzer（セッション開始時に1回実行）
- プロフィール全文 + 回答済み質問IDリストを入力
- 重複・矛盾・古い情報をJSON形式で出力
- 未入力の質問リストをpriority順で生成
- Gemini 2.0 Flash / Temperature: 0.1

#### Stage 2: Hearing AI（毎回の対話で使用・ストリーミング）
- **現在の質問1つ** + **該当セクションの既存情報のみ**をプロンプトに含める
- プロンプトサイズ: ~800-1000トークン（従来の3000-5000トークンから大幅削減）
- 会話テキスト + `<!--EXTRACTED_DATA ... EXTRACTED_DATA-->` マーカーで抽出情報を返す
- Gemini 2.0 Flash / Temperature: 0.4

#### Stage 3: Profile Editor（バックグラウンド実行）
- Hearing AIの `EXTRACTED_DATA` を受け取り
- 既存セクション内容と照合して ADD vs UPDATE を判定（重複防止）
- `PROFILE_ACTION` JSONを生成
- Gemini 2.0 Flash / Temperature: 0.1

### data_analysis / helpモード: 従来方式

data_analysis / helpモードは従来どおり単一システムプロンプトで動作:
- プロフィール全文 + 診断記録をコンテキストに含める
- モード別のルール（分析 or FAQ）をプロンプトに記載
- PROFILE_ACTIONは出力しない

### 共通要素

```markdown
## ウェルカムメッセージの番号選択への対応
（プロフィール完成済みの3択メニュー表示時のみ）

## 設定ページへの誘導
- Fitbit連携 → /settings/fitbit
- Google Docs連携 → /settings/google-docs
- スマホデータ連携 → /settings/data-sync
- 検査項目の設定 → /profile/settings/items

## 重要なルール
1. 確認が必要: confidence < 0.8 の更新は実行前に確認を求める
2. 削除は慎重に: confidence 0.95以上でないと自動実行しない
3. 必ず質問を含める: 終了希望以外は必ず1つ質問を含める
```

---

## API設計

### GET /api/health-chat/v2/session

セッション取得/新規作成。新規セッション時にProfile Analyzerを実行し、最初の質問を含むウェルカムメッセージを生成。

**レスポンス:**
```json
{
  "success": true,
  "sessionId": "uuid",
  "status": "active",
  "mode": "profile_building",
  "welcomeMessage": "（ウェルカムメッセージ + 最初の質問）",
  "messages": [],
  "analyzerResult": {
    "issues": [
      { "type": "DUPLICATE", "sectionId": "basic_attributes", "description": "...", "suggestedFix": "..." }
    ],
    "missingQuestions": [
      { "sectionId": "basic_attributes", "questionId": "1-1", "question": "..." }
    ]
  },
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

**処理フロー（profile_buildingモード）:**
1. 認証チェック・レート制限
2. Google Docsからプロフィール読み込み（該当セクションのみ抽出）
3. 会話履歴取得（最大20件、超過分はサマリー化）
4. **Hearing AI**のシステムプロンプトを構築（現在の質問1つ + セクション情報）
5. Gemini 2.0 Flash にストリーミングリクエスト
6. SSEでリアルタイム応答（`EXTRACTED_DATA`ブロックはフィルタリング）
7. 応答完了後、`EXTRACTED_DATA`をパース
8. **Profile Editor AI**に抽出データを渡してPROFILE_ACTIONを生成
9. confidence ≥ 0.8 のアクションを自動実行（DELETEは 0.95以上）
10. 低confidence のアクションはpendingActionsとして返却
11. 質問進捗を更新
12. メッセージ保存・Google Docs同期

**処理フロー（data_analysis / helpモード）:**
1-4は従来どおり単一システムプロンプトで処理

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

### EXTRACTED_DATA フォーマット（Hearing AI → Profile Editor）

profile_buildingモードでHearing AIが出力する抽出データ:

```
<!--EXTRACTED_DATA
{
  "questionId": "1-1",
  "sectionId": "basic_attributes",
  "rawAnswer": "ユーザーの元の回答テキスト",
  "extractedFacts": [
    {
      "key": "name",
      "value": "田中太郎",
      "hint": "名前",
      "confidence": 0.95
    }
  ],
  "isSkipped": false,
  "needsClarification": false
}
EXTRACTED_DATA-->
```

### PROFILE_ACTION フォーマット（Profile Editor → DB更新）

Profile Editorが生成するアクション（従来形式と互換）:

```
{
  "actions": [
    {
      "type": "ADD" | "UPDATE" | "DELETE" | "NONE",
      "section_id": "セクションID",
      "target_text": "更新/削除対象テキスト（UPDATEの場合）",
      "new_text": "追加/更新後テキスト",
      "reason": "変更理由",
      "confidence": 0.0-1.0
    }
  ]
}
```

### ストリーミング時のマーカーフィルタリング

SSEストリーミング中、マーカーブロック（`EXTRACTED_DATA` or `PROFILE_ACTION`）がチャンク境界で分割される問題に対応:
- モードに応じてフィルタリング対象を切替（profile_building → `EXTRACTED_DATA`、その他 → `PROFILE_ACTION`）
- `insideMarker` フラグで状態管理
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
│   │           └── session/route.ts   # セッション管理API + Profile Analyzer統合
│   ├── help/
│   │   └── page.tsx                   # FAQ/ヘルプページ
│   └── health-profile/
│       └── page.tsx                   # 健康プロフページ
├── components/
│   └── health-profile/
│       └── ChatHearingV2.tsx          # チャットUIコンポーネント
├── constants/
│   ├── health-profile.ts             # 11カテゴリ定義
│   └── health-questions.ts           # 169問の質問マスターデータ
└── lib/
    ├── agents/                        # 3エージェントパイプライン
    │   ├── types.ts                   # 共有型定義
    │   ├── profile-analyzer.ts        # Stage 1: プロフィール分析AI
    │   ├── hearing-agent.ts           # Stage 2: ヒアリングAI
    │   └── profile-editor.ts          # Stage 3: プロフィール編集AI
    ├── chat-prompts.ts                # モード別プロンプト + 共通ユーティリティ
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
mode: 'profile_building' | 'data_analysis' | 'help' | null
currentPriority: Int
currentQuestionId: String?
currentSectionId: String?
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

### Phase 3: 3エージェントパイプライン ✅
1. Profile Analyzer: プロフィール重複・矛盾検出 + 未入力質問リスト
2. Hearing AI: 1問集中型ヒアリング（プロンプト~800トークンに削減）
3. Profile Editor: ADD/UPDATE判定特化の編集AI
4. 番号選択メニュー廃止 → プロフィール未完成時は即質問開始
5. フロントエンドにアナライザー検出結果のバナー表示UI追加

### Phase 4: 改善（次回以降）
1. コンテキストキャッシング最適化
2. ユーザーフィードバックループ
3. アナライザー結果を活用した自動整理提案

### Phase 5: 高度化（将来）
1. Gemini 2.5への移行
2. 外部データの自動統合
3. 予測的な健康提案

---

## 期待される改善効果

| 問題 | v1 | v2 | v2.1 (3エージェント) |
|------|-----|-----|-----|
| 重複質問 | 頻発 | プロフィール全文参照 | 該当セクションのみ参照で集中 |
| 重複情報 | 放置 | AIが検出（不安定） | 専用Analyzerで確実に検出 |
| プロンプト肥大化 | - | 3000-5000トークン | ~800-1000トークン |
| 番号メニュー | - | 5-11個の番号選択 | 未完成時は即質問開始 |
| ADD/UPDATE判定 | - | 1つのLLMに全責任 | 専用Editorで精密判定 |
| 古い情報 | 放置 | 診断記録と比較 | Analyzerが事前検出 |
| 固定質問 | 硬直的 | AI が柔軟に対話 | 質問マスター+AI柔軟性の両立 |
| コンテキスト | 断片的 | 全情報を把握 | 役割別に最適化されたコンテキスト |
| 健康分析 | なし | データ分析・アドバイス | 同左 |
| 使い方サポート | なし | FAQ情報から回答 | 同左 |
| リアルタイム性 | 一括応答 | SSEストリーミング | 同左 |
| ウェルカム | 固定 | 動的生成 | 動的生成+最初の質問を即表示 |
