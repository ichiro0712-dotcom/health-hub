# チャットシステム包括リファクタリング計画

## 変更要件一覧

### バグ修正（優先度: 高）

#### 3-A. ストリーム競合修正
- **ファイル**: `src/components/health-profile/ChatHearingV2.tsx`
- **問題**: AI応答中にモーダルを閉じ→開き→新メッセージ送信すると、前のストリームと新しいストリームが同時にメッセージを更新する
- **修正**: `sendMessage`の冒頭で`abortControllerRef.current?.abort()`を呼び、前のストリーミングをキャンセルする
- **注意**: モーダルを閉じて開くだけ（新メッセージ送信なし）なら前のストリームは継続させる

#### 3-C. SSEチャンクバッファリング修正
- **ファイル**: `src/components/health-profile/ChatHearingV2.tsx`
- **問題**: SSEチャンクがメッセージ境界で分割された場合、`data: `行が途中で切れてJSONパースに失敗しテキスト欠落する
- **修正**: 改行で区切るバッファリング処理を追加。不完全な行は次のチャンクと結合してからパースする

#### 3-F. temperature条件分岐修正
- **ファイル**: `src/app/api/health-chat/v2/stream/route.ts`
- **問題**: `temperature: isProfileBuilding ? 0.4 : 0.4` が無意味
- **修正**: profile_building=0.4、data_analysis=0.7、help=0.4 に設定

### バグリスク修正（優先度: 中）

#### 2-B. レート制限統合
- **新規ファイル**: `src/lib/rate-limit.ts`
- **変更ファイル**: `src/app/api/health-chat/v2/route.ts`, `src/app/api/health-chat/v2/stream/route.ts`
- **問題**: route.tsとstream/route.tsが独立したrateLimitMapを持ち、交互に叩くと実質40リクエスト/分
- **修正**: 共通モジュールに切り出して1つのMapで管理

#### 3-D. stream/route.tsのissue承認がGeminiに流れる問題
- **ファイル**: `src/app/api/health-chat/v2/stream/route.ts`
- **問題**: isIssueConfirmation/isIssueRejectionがtrueでも早期returnせず通常のGeminiストリーミングに流れる
- **修正**: issue承認/拒否時はroute.tsと同様に早期returnし、固定メッセージをSSEで返す

### 非効率解消（優先度: 高）

#### 2-A. route.tsをissue/pendingActions処理専用に縮小
- **ファイル**: `src/app/api/health-chat/v2/route.ts`
- **問題**: stream/route.tsと巨大な重複（モード判定、Hearing AI構築、Profile Editor、質問進捗更新等）
- **修正**: route.tsからAI会話処理を削除し、以下のみ残す：
  - pendingActions承認/拒否
  - analyzerIssue承認/拒否
  - 終了リクエスト
  - 通常メッセージが来た場合はstream/route.tsにリダイレクト案内（or フロント側でroute.tsを呼ばないよう統一）
- **注意**: フロントエンドの`sendMessage`のroute.ts呼び出し条件も合わせて修正。pendingActions/analyzerIssues処理時のみroute.tsを使い、それ以外はすべてstream/route.tsを使う

#### 2-C. getHearingContext内の不要DBクエリ削除
- **ファイル**: `src/app/api/health-chat/v2/stream/route.ts`
- **問題**: `getHearingContext`内でmessageCountをDBクエリで取得しているが、呼び出し元で既にsession.messagesを取得済み
- **修正**: `isFirstQuestion`パラメータを呼び出し元から渡す

#### 2-D. プロフィールチェック要求時のSSE構築コード共通化
- **ファイル**: `src/app/api/health-chat/v2/stream/route.ts`
- **問題**: 3つの分岐でほぼ同じSSEレスポンス構築パターンが重複
- **修正**: `createSimpleSSEResponse(text, extras)` ヘルパー関数を作成

#### 2-E. 旧モノリシックプロンプト削除判断
- **ファイル**: `src/lib/chat-prompts.ts`
- **判断**: `buildProfileBuildingPrompt`はフォールバック（質問が尽きた場合）で使われるため、完全削除はせず、コメントで「フォールバック用」と明記するのみ

### UI/UX改善

#### 4-A. タイピングインジケーター
- **ファイル**: `src/components/health-profile/ChatHearingV2.tsx`
- **修正**: ストリーミング中、テキストが空の間は「...」アニメーション（3ドットバウンス）を表示。テキスト到着で自動的に置き換わる

#### 4-B. バックグラウンド動作フィードバック
- **ファイル**: `src/components/FloatingMenu.tsx`, `src/components/ChatModal.tsx`, `src/contexts/ChatModalContext.tsx`
- **修正**: ChatModalContextに`isAIResponding`状態を追加。ChatHearingV2のisLoading変化時にカスタムイベント経由でChatModalに伝達。FloatingMenuのチャットボタンにパルスアニメーションを追加

#### 4-C. マークダウンレンダリング強化
- **ファイル**: `src/components/health-profile/ChatHearingV2.tsx`
- **修正**: `react-markdown`パッケージを導入。現在の手動パース（`**bold**`、`---`、リンク検出）を`react-markdown`に置き換え。カスタムリンクレンダラーで内部リンク（`/path`）の検出は維持

#### 4-D. Hearing AIに次の質問候補を含める
- **ファイル**: `src/lib/agents/hearing-agent.ts`, `src/lib/agents/types.ts`, `src/app/api/health-chat/v2/stream/route.ts`
- **修正**: HearingAgentInputに`nextQuestion`フィールドを追加。プロンプトに「ユーザーが回答したら、共感を示した後、次の質問に自然に移ってください。次の質問: XXX」を追加。stream/route.tsのgetHearingContext内で次の質問も取得して渡す

#### 4-E. プロフィールチェック正規表現拡充
- **ファイル**: `src/app/api/health-chat/v2/stream/route.ts`
- **修正**: パターンを拡充（「問題ないか見て」「点検」「ダブり」「見直して」「大丈夫？」等を追加）

#### 4-F. issue承認/拒否のボタン化
- **ファイル**: `src/components/health-profile/ChatHearingV2.tsx`
- **修正**: analyzerIssuesが表示されている時に、メッセージ下部に「修正する」「スキップ」ボタンを表示。ボタン押下で`sendMessage('はい')`/`sendMessage('スキップ')`を呼ぶ。正規表現も`/^(はい|うん|OK|オッケー|お願い|実行|やって)/i`に前方一致化

### その他

#### 3-B. issue番号計算の明確化
- **ファイル**: `src/components/health-profile/ChatHearingV2.tsx`
- **修正**: `nextIdx`の計算を`analyzerIssues.length - remaining.length + 1`に明確化

#### 3-E. isAnalyzingの整理
- **ファイル**: `src/components/health-profile/ChatHearingV2.tsx`
- **修正**: `isAnalyzing`はhandleManualSync時のみ使用。startNewSessionではサーバー側でAnalyzer実行完了後にレスポンスが返るため、isInitializingで十分。startNewSessionからisAnalyzingのset/resetを削除

#### 1-A~D. 仕様ドキュメント更新
- **ファイル**: `docs/NEW_CHAT_ARCHITECTURE.md`
- **修正**: モーダル/タブ動作、session/analyzeエンドポイント、HealthQuestionProgressテーブル使用、Profile Analyzer実行タイミングの記載を実装に合わせて更新

---

## 実装順序

1. 共通モジュール作成（rate-limit.ts）
2. stream/route.ts修正（temperature、SSEヘルパー、issue早期return、正規表現拡充、次の質問渡し、不要クエリ削除）
3. route.ts縮小（AI会話処理削除、issue/pending専用化）
4. hearing-agent.ts修正（次の質問プロンプト追加）
5. types.ts修正（nextQuestionフィールド追加）
6. chat-prompts.ts修正（フォールバックコメント追記）
7. ChatHearingV2.tsx修正（ストリーム競合、SSEバッファリング、タイピングインジケーター、マークダウン、issue番号、isAnalyzing整理、ボタン化）
8. react-markdown パッケージインストール
9. ChatModalContext.tsx修正（isAIResponding追加）
10. ChatModal.tsx修正（isAIResponding伝達）
11. FloatingMenu.tsx修正（パルスアニメーション）
12. 仕様ドキュメント更新
