# 健康プロフィール AIチャット 新アーキテクチャ設計

## 現状の問題点

1. **重複質問**: 既存プロフィールに回答済みの内容を再度質問する
2. **重複情報**: プロフィールに同じ項目が複数回記載されても検出・解決しない
3. **コンテキスト不足**: AIがプロフィール全体を把握していない
4. **質問駆動の限界**: 固定質問リストに縛られ、柔軟な対話ができない

## 新アーキテクチャ: "Google Docs Truth Source" モデル

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
│         READ (チャット開始時)                                │
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

## 新しいシステムプロンプト設計

### Phase 1: コンテキスト構築

チャット開始時に以下を取得:
- Google Docsから健康プロフィール全文（READ）
- Google Docsから診断記録全文（READ）
- DBから習慣データサマリー
- DBからスマホデータサマリー

### Phase 2: AIへの指示（新システムプロンプト）

```markdown
あなたは健康プロフィールの構築・改善を支援するAIアシスタントです。

## あなたが持っている情報

### 現在の健康プロフィール
{FULL_PROFILE_FROM_GOOGLE_DOCS}

### 診断記録データ
{RECORDS_SUMMARY}

### 習慣・デバイスデータ
{HABITS_AND_DEVICE_DATA}

## あなたの役割

1. **ユーザーの意図を理解する**
   - 情報を追加したい
   - 情報を修正・削除したい
   - 質問に答えてほしい
   - プロフィールを充実させたい

2. **プロフィールの改善提案**
   - 不足している重要な情報を特定
   - 古くなった情報を検出
   - 重複・矛盾を発見して解決提案

3. **自然な対話**
   - 固定の質問リストに縛られない
   - ユーザーの話の流れに沿って深掘り
   - 適切なタイミングで関連質問

## 出力形式

ユーザーへの応答と、プロフィール更新アクションを分離して出力してください。

### 応答テキスト
ユーザーに表示するメッセージ（自然な日本語）

### プロフィール更新アクション（JSON）
<!--PROFILE_ACTION
{
  "actions": [
    {
      "type": "ADD" | "UPDATE" | "DELETE" | "NONE",
      "section_id": "セクションID",
      "target_text": "更新対象のテキスト（UPDATE/DELETEの場合）",
      "new_text": "新しいテキスト（ADD/UPDATEの場合）",
      "reason": "変更理由",
      "confidence": 0.0-1.0
    }
  ],
  "detected_issues": [
    {
      "type": "DUPLICATE" | "CONFLICT" | "OUTDATED",
      "description": "問題の説明",
      "suggested_resolution": "解決案"
    }
  ],
  "follow_up_topic": "次に聞くべきトピック（あれば）"
}
PROFILE_ACTION-->

## 重要なルール

1. **プロフィールに既に書いてあることは質問しない**
2. **重複を見つけたら統合を提案する**
3. **診断記録と矛盾する情報を見つけたら確認する**
4. **confidence < 0.7 の更新は確認を求める**
5. **ユーザーが「保存して」と言ったらアクションを実行**
```

---

## API設計

### POST /api/health-chat/v2

#### リクエスト
```json
{
  "message": "ユーザーのメッセージ",
  "sessionId": "セッションID（省略時は新規作成）"
}
```

#### 処理フロー

```typescript
async function handleChatV2(message: string, sessionId?: string) {
  // 1. セッション取得または作成
  const session = await getOrCreateSession(sessionId);

  // 2. コンテキスト構築（初回のみ or 5分以上経過時）
  let context = session.cachedContext;
  if (!context || isStale(session.contextCachedAt, 5 * 60 * 1000)) {
    context = await buildFullContext(userId);
    await cacheContext(session.id, context);
  }

  // 3. 会話履歴取得
  const history = await getConversationHistory(session.id);

  // 4. システムプロンプト構築
  const systemPrompt = buildSystemPromptV2(context);

  // 5. AI呼び出し（Gemini 2.0 Flash）
  const aiResponse = await callGeminiWithStructuredOutput(
    systemPrompt,
    history,
    message
  );

  // 6. レスポンス解析
  const { responseText, profileAction } = parseAIResponse(aiResponse);

  // 7. 高信頼度のアクションは即座に実行
  const executedActions = [];
  for (const action of profileAction.actions) {
    if (action.confidence >= 0.9 || action.type === 'NONE') {
      await executeProfileAction(userId, action);
      executedActions.push(action);
    }
  }

  // 8. 問題検出をユーザーに報告
  let finalResponse = responseText;
  if (profileAction.detected_issues.length > 0) {
    finalResponse += formatIssuesForUser(profileAction.detected_issues);
  }

  // 9. メッセージ保存
  await saveMessages(session.id, message, finalResponse);

  // 10. Google Docs同期（バックグラウンド）
  if (executedActions.length > 0) {
    syncToGoogleDocsAsync(userId);
  }

  return {
    response: finalResponse,
    sessionId: session.id,
    executedActions,
    pendingActions: profileAction.actions.filter(a => a.confidence < 0.9)
  };
}
```

---

## コンテキスト構築

### buildFullContext()

```typescript
async function buildFullContext(userId: string): Promise<FullContext> {
  // 並列取得
  const [
    profileFromDocs,
    recordsFromDocs,
    habitsFromDB,
    smartphoneFromDB
  ] = await Promise.all([
    readHealthProfileFromGoogleDocs(),      // 新規実装
    readRecordsFromGoogleDocs(),            // 新規実装
    getHabitsSummary(userId),
    getSmartphoneDataSummary(userId)
  ]);

  return {
    profile: profileFromDocs,
    records: recordsFromDocs,
    habits: habitsFromDB,
    smartphone: smartphoneFromDB,
    fetchedAt: new Date()
  };
}
```

### Google Docsからの読み取り（新規実装）

```typescript
// src/lib/google-docs.ts に追加

export async function readHealthProfileFromGoogleDocs(): Promise<string> {
  const docs = getDocsClient();
  const doc = await docs.documents.get({ documentId: HEALTH_PROFILE_DOC_ID });

  // ドキュメントの全テキストを抽出
  let text = '';
  const content = doc.data.body?.content || [];
  for (const element of content) {
    if (element.paragraph?.elements) {
      for (const e of element.paragraph.elements) {
        if (e.textRun?.content) {
          text += e.textRun.content;
        }
      }
    }
  }

  return text;
}

export async function readRecordsFromGoogleDocs(): Promise<string> {
  const docs = getDocsClient();
  const doc = await docs.documents.get({ documentId: RECORDS_DOC_ID });

  // 同様にテキスト抽出
  // ...

  return text;
}
```

---

## 構造化出力（Gemini 2.0 Flash）

```typescript
async function callGeminiWithStructuredOutput(
  systemPrompt: string,
  history: Message[],
  userMessage: string
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          ...history.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        generationConfig: {
          temperature: 0.3,  // 情報抽出は低め
          maxOutputTokens: 4096,
        }
      })
    }
  );

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
```

---

## 重複検出・解決ロジック

AIが検出した問題に対する処理:

```typescript
interface DetectedIssue {
  type: 'DUPLICATE' | 'CONFLICT' | 'OUTDATED';
  description: string;
  suggested_resolution: string;
}

function formatIssuesForUser(issues: DetectedIssue[]): string {
  if (issues.length === 0) return '';

  let message = '\n\n---\n**プロフィールの改善提案**:\n';

  for (const issue of issues) {
    switch (issue.type) {
      case 'DUPLICATE':
        message += `- 重複を発見: ${issue.description}\n  → ${issue.suggested_resolution}\n`;
        break;
      case 'CONFLICT':
        message += `- 矛盾を発見: ${issue.description}\n  → ${issue.suggested_resolution}\n`;
        break;
      case 'OUTDATED':
        message += `- 古い情報の可能性: ${issue.description}\n  → ${issue.suggested_resolution}\n`;
        break;
    }
  }

  message += '\n「修正して」と言っていただければ対応します。';
  return message;
}
```

---

## 移行計画

### Phase 1: 基盤（今回実装）
1. Google Docsからの読み取り機能
2. 新しいシステムプロンプト
3. 構造化出力の解析
4. 基本的なアクション実行

### Phase 2: 改善（次回以降）
1. コンテキストキャッシング最適化
2. 重複検出アルゴリズムの精緻化
3. ユーザーフィードバックループ
4. 質問進捗システムの再設計（オプショナル化）

### Phase 3: 高度化（将来）
1. Gemini 2.5への移行
2. 外部データの自動統合
3. 予測的な健康提案

---

## 期待される改善効果

| 問題 | 現状 | 新アーキテクチャ |
|------|------|------------------|
| 重複質問 | 頻発 | プロフィール全文を参照するため発生しない |
| 重複情報 | 放置 | AI が検出して解決を提案 |
| 古い情報 | 放置 | 診断記録と比較して検出 |
| 固定質問 | 硬直的 | AI が状況に応じて柔軟に対話 |
| コンテキスト | 断片的 | 全情報を把握して回答 |

---

## セキュリティ考慮事項

- Google Docs APIの認証はサービスアカウント経由（既存）
- ユーザーごとのデータ分離はDB側で担保
- センシティブデータのログ出力は最小限に
