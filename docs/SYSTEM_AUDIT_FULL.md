# システム監査レポート - 全96件

作成日: 2026-02-04
ステータス: 修正作業中

---

## 目次

1. [Critical Issues (9件)](#critical-issues-9件)
2. [High Issues (27件)](#high-issues-27件)
3. [Medium Issues (37件)](#medium-issues-37件)
4. [Low Issues (23件)](#low-issues-23件)
5. [修正進捗](#修正進捗)

---

## Critical Issues (9件)

### C-1: Export APIアクセス制御の欠陥
- **ファイル**: `src/app/api/admin/backup/export/route.ts`
- **行**: 23-28
- **問題**: 本番環境で管理者チェックが未実装。認証済みユーザー全員がDB全体をエクスポート可能
- **影響**: 全ユーザーデータ漏洩リスク
- **修正**: 管理者メールチェック追加
- **ステータス**: [ ] 未修正

### C-2: IDOR脆弱性 - Export APIでuserId指定可能
- **ファイル**: `src/app/api/admin/backup/export/route.ts`
- **行**: 47-49
- **問題**: 任意のuserIdパラメータを受け入れ、他ユーザーのデータをエクスポート可能
- **影響**: データ分離の完全なバイパス
- **修正**: userIdパラメータを管理者のみに制限
- **ステータス**: [ ] 未修正

### C-3: Next.js非推奨パターン - viewport in metadata
- **ファイル**: `src/app/layout.tsx` および全ページ
- **行**: 22
- **問題**: metadataにviewportを含めている（Next.js 14+で非推奨）
- **影響**: 全ページで警告発生、将来的に動作しなくなる可能性
- **修正**: `export const viewport`を別途定義
- **ステータス**: [ ] 未修正

### C-4: Error Boundary欠如
- **ファイル**: `src/app/layout.tsx`
- **行**: 39-62
- **問題**: ルートレイアウトにError Boundaryがない
- **影響**: 任意のコンポーネントエラーでアプリ全体がクラッシュ
- **修正**: ErrorBoundaryコンポーネント追加
- **ステータス**: [ ] 未修正

### C-5: N+1クエリ - saveHealthRecord
- **ファイル**: `src/app/actions/health-record.ts`
- **行**: 41-98
- **問題**: forループ内で複数のDBクエリを実行（50項目で200+クエリ）
- **影響**: 極端なパフォーマンス低下
- **修正**: バッチ処理に変更
- **ステータス**: [ ] 未修正

### C-6: トランザクション欠如 - saveHealthRecord
- **ファイル**: `src/app/actions/health-record.ts`
- **行**: 36-128
- **問題**: 複数のDB操作がトランザクションで囲まれていない
- **影響**: 途中失敗でデータ不整合
- **修正**: $transactionで囲む
- **ステータス**: [ ] 未修正

### C-7: レースコンディション - normalizeItemName
- **ファイル**: `src/app/actions/items.ts`
- **行**: 205-219
- **問題**: 全MasterItemをメモリにロードしてマッチング
- **影響**: メモリ枯渇、パフォーマンス低下
- **修正**: DBレベルでの検索に変更
- **ステータス**: [ ] 未修正

### C-8: 入力バリデーション欠如 - updateRecord
- **ファイル**: `src/app/actions/records.ts`
- **行**: 91-126
- **問題**: `data`パラメータがany型でバリデーションなし
- **影響**: 任意データのDB書き込み可能
- **修正**: Zodスキーマでバリデーション
- **ステータス**: [ ] 未修正

### C-9: JSON検証なし
- **ファイル**: `prisma/schema.prisma`
- **行**: 80, 83, 103, 109-111
- **問題**: 複数のJSONフィールドが未検証で保存
- **影響**: 不正データでアプリクラッシュ
- **修正**: アプリケーション層でバリデーション
- **ステータス**: [ ] 未修正

---

## High Issues (27件)

### H-1: Cronジョブ認証バイパス
- **ファイル**: `src/app/api/cron/fitbit-sync/route.ts`
- **行**: 31-34
- **問題**: CRON_SECRET未設定時に認証なしでアクセス可能
- **修正**: `if (!CRON_SECRET || ...)`に変更
- **ステータス**: [ ] 未修正

### H-2: OAuthステートがDBフィールド誤用
- **ファイル**: `src/app/api/fitbit/auth/route.ts`
- **行**: 49-59
- **問題**: scopeフィールドにpending:stateを保存
- **修正**: 専用のstateフィールドまたはセッション使用
- **ステータス**: [ ] 未修正

### H-3: 機密OAuth設定のログ出力
- **ファイル**: `src/app/api/fitbit/callback/route.ts`
- **行**: 74-81
- **問題**: clientSecretの長さなどをログ出力
- **修正**: 本番でデバッグログ削除
- **ステータス**: [ ] 未修正

### H-4: ユーザーメールのログ出力
- **ファイル**: `src/app/api/report/analyze/route.ts`
- **行**: 100-104
- **問題**: PII（メールアドレス）をログ出力
- **修正**: デバッグログ削除
- **ステータス**: [ ] 未修正

### H-5: 入力長バリデーション欠如
- **ファイル**: 複数のAPIルート
- **問題**: name, unit, color等の文字列フィールドに長さ制限なし
- **修正**: 最大長バリデーション追加
- **ステータス**: [ ] 未修正

### H-6: レート制限なし
- **ファイル**: 全APIエンドポイント
- **問題**: レート制限が未実装
- **影響**: DoS攻撃、API費用増大
- **修正**: ミドルウェアでレート制限実装
- **ステータス**: [ ] 未修正

### H-7: Next.js Image未使用 - page.tsx
- **ファイル**: `src/app/page.tsx`
- **行**: 107-111
- **問題**: `<img>`タグ使用
- **修正**: `<Image>`コンポーネントに変更
- **ステータス**: [ ] 未修正

### H-8: Next.js Image未使用 - Header.tsx
- **ファイル**: `src/components/Header.tsx`
- **行**: 67
- **問題**: アバター画像で`<img>`使用
- **修正**: `<Image>`コンポーネントに変更
- **ステータス**: [ ] 未修正

### H-9: Next.js Image未使用 - FloatingMenu.tsx
- **ファイル**: `src/components/FloatingMenu.tsx`
- **行**: 126-127
- **問題**: プロフィール画像で`<img>`使用
- **修正**: `<Image>`コンポーネントに変更
- **ステータス**: [ ] 未修正

### H-10: Next.js Image未使用 - VideoSection.tsx
- **ファイル**: `src/components/home/VideoSection.tsx`
- **行**: 191-194
- **問題**: サムネイルで`<img>`使用
- **修正**: `<Image>`コンポーネントに変更
- **ステータス**: [ ] 未修正

### H-11: アクセシビリティ - ボタンにaria-label欠如
- **ファイル**: `src/components/habits/SupplementsTab.tsx`
- **行**: 304
- **問題**: 閉じるボタンに`×`のみでaria-labelなし
- **修正**: aria-label="閉じる"追加
- **ステータス**: [ ] 未修正

### H-12: フォームバリデーションフィードバック欠如
- **ファイル**: `src/components/habits/SupplementsTab.tsx`
- **行**: 306-409
- **問題**: インラインバリデーションなし
- **修正**: フィールドごとのエラー表示追加
- **ステータス**: [ ] 未修正

### H-13: 削除操作のローディング状態欠如
- **ファイル**: `src/components/habits/HabitsClient.tsx`
- **行**: 167-182
- **問題**: 削除中のローディング表示なし
- **修正**: ローディング状態追加
- **ステータス**: [ ] 未修正

### H-14: Rechartsの大きなバンドルインポート
- **ファイル**: `src/app/trends/page.tsx`
- **行**: 8-9
- **問題**: Recharts全体をインポート
- **修正**: dynamic importで分割
- **ステータス**: [ ] 未修正

### H-15: DBインデックス欠如 - HealthRecord.userId
- **ファイル**: `prisma/schema.prisma`
- **行**: 70-91
- **問題**: userIdにインデックスなし
- **修正**: @@index([userId])追加
- **ステータス**: [ ] 未修正

### H-16: DBインデックス欠如 - FitData.userId
- **ファイル**: `prisma/schema.prisma`
- **行**: 93-123
- **問題**: userIdのみでのクエリにインデックスなし
- **修正**: @@index([userId])追加
- **ステータス**: [ ] 未修正

### H-17: DBインデックス欠如 - Supplement.userId
- **ファイル**: `prisma/schema.prisma`
- **行**: 188-207
- **問題**: [userId, order]複合インデックスなし
- **修正**: @@index([userId, order])追加
- **ステータス**: [ ] 未修正

### H-18: DBインデックス欠如 - LifestyleHabit.userId
- **ファイル**: `prisma/schema.prisma`
- **行**: 148-167
- **問題**: [userId, createdAt]複合インデックスなし
- **修正**: @@index([userId, createdAt])追加
- **ステータス**: [ ] 未修正

### H-19: DBインデックス欠如 - InspectionItem.userId
- **ファイル**: `prisma/schema.prisma`
- **行**: 211-227
- **問題**: userIdのみでのクエリにインデックスなし
- **修正**: @@index([userId])追加
- **ステータス**: [ ] 未修正

### H-20: N+1クエリ - getTrendsData
- **ファイル**: `src/app/actions/trends.ts`
- **行**: 27-199
- **問題**: 6つの連続クエリ
- **修正**: Promise.allで並列化
- **ステータス**: [ ] 未修正

### H-21: 到達不能コード - getDashboardData
- **ファイル**: `src/app/actions/dashboard.ts`
- **行**: 84-168
- **問題**: 早期returnで後続コードが実行されない
- **修正**: ロジック修正
- **ステータス**: [ ] 未修正

### H-22: 重複getUserId()パターン
- **ファイル**: `src/app/actions/habits.ts`, `supplements.ts`, `items.ts`, `health-profile.ts`
- **問題**: 各ファイルでgetUserId()を再実装
- **修正**: 共通ユーティリティに統合
- **ステータス**: [ ] 未修正

### H-23: HabitRecordの冗長なuserId
- **ファイル**: `prisma/schema.prisma`
- **行**: 420-421
- **問題**: habit.userIdから導出可能なのに別途保存
- **修正**: 設計見直し（影響大のため保留可）
- **ステータス**: [ ] 未修正

### H-24: バックアップにOAuthトークン含む
- **ファイル**: `src/lib/backup/types.ts`
- **行**: 67-74, 182-194
- **問題**: エクスポートにaccess_token, refresh_token含む
- **修正**: トークンを除外またはマスク
- **ステータス**: [ ] 未修正

### H-25: TypeScript @ts-ignore多用
- **ファイル**: 複数ファイル
- **問題**: session.user.idアクセスで@ts-ignore使用
- **修正**: next-authの型拡張
- **ステータス**: [ ] 未修正

### H-26: Habit typeフィールドのバリデーション欠如
- **ファイル**: `src/app/api/habits/[habitId]/route.ts`
- **行**: 29-37
- **問題**: PUTでtypeのバリデーションなし
- **修正**: POSTと同様のバリデーション追加
- **ステータス**: [ ] 未修正

### H-27: トランザクション分離欠如 - Habit Order更新
- **ファイル**: `src/app/api/habits/route.ts`
- **行**: 96-103
- **問題**: habitIdの所有権確認前に更新
- **修正**: 事前確認追加
- **ステータス**: [ ] 未修正

---

## Medium Issues (37件)

### M-1: モーダルのキーボードナビゲーション欠如
- **ファイル**: `src/components/BottomNav.tsx`
- **行**: 34-39
- **問題**: Escapeキーでモーダルを閉じられない
- **ステータス**: [ ] 未修正

### M-2: ローディング状態の不整合
- **ファイル**: `src/components/habits/HabitsClient.tsx`
- **行**: 271-279
- **問題**: スケルトンUIなし
- **ステータス**: [ ] 未修正

### M-3: モーダルのフォーカストラップ欠如
- **ファイル**: `src/components/habits/HabitsClient.tsx`
- **行**: 439-513
- **問題**: モーダル内にフォーカスを閉じ込めていない
- **ステータス**: [ ] 未修正

### M-4: 動的コンテンツのaria-live欠如
- **ファイル**: `src/app/advisor/ReportClient.tsx`
- **行**: 318-358
- **問題**: スコア更新を読み上げない
- **ステータス**: [ ] 未修正

### M-5: 色コントラスト不足
- **ファイル**: `src/components/habits/LifestyleTab.tsx`
- **行**: 120-124
- **問題**: text-slate-400がWCAG基準未達
- **ステータス**: [ ] 未修正

### M-6: スキップリンク欠如
- **ファイル**: `src/app/layout.tsx`
- **行**: 44-61
- **問題**: メインコンテンツへのスキップリンクなし
- **ステータス**: [ ] 未修正

### M-7: ToasterのProvider外配置
- **ファイル**: `src/app/layout.tsx`
- **行**: 58
- **問題**: テーマコンテキスト外にToaster配置
- **ステータス**: [ ] 未修正

### M-8: アイコンボタンのaria-label欠如
- **ファイル**: `src/components/habits/LifestyleTab.tsx`
- **行**: 145-147
- **問題**: トグルボタンにラベルなし
- **ステータス**: [ ] 未修正

### M-9: 未保存変更の遷移ブロック欠如
- **ファイル**: `src/components/habits/HealthProfileClient.tsx`
- **行**: 395-399
- **問題**: beforeunloadなし
- **ステータス**: [ ] 未修正

### M-10: エラー状態UIなし
- **ファイル**: `src/app/trends/page.tsx`
- **行**: 105-107
- **問題**: トーストのみでエラー表示
- **ステータス**: [ ] 未修正

### M-11: 不要な再レンダリング - VideoSection
- **ファイル**: `src/components/home/VideoSection.tsx`
- **行**: 19-49
- **問題**: useCallback依存配列の問題
- **ステータス**: [ ] 未修正

### M-12: 管理者メールの正規化不完全
- **ファイル**: `src/app/api/admin/backup/import/route.ts`
- **行**: 24-27
- **問題**: Unicode正規化なし
- **ステータス**: [ ] 未修正

### M-13: バックアップファイルサイズ制限なし
- **ファイル**: `src/app/api/admin/backup/import/route.ts`
- **行**: 50-51
- **問題**: 巨大JSONでメモリ枯渇
- **ステータス**: [ ] 未修正

### M-14: 詳細エラーメッセージの露出
- **ファイル**: 複数のAPIルート
- **問題**: error.messageをそのままクライアントに返却
- **ステータス**: [ ] 未修正

### M-15: Content-Type検証なし
- **ファイル**: `src/app/api/fitbit/sync/route.ts`
- **行**: 42-49
- **問題**: 不正JSONを黙って無視
- **ステータス**: [ ] 未修正

### M-16: CORS設定なし
- **ファイル**: 全APIルート
- **問題**: 明示的CORS設定なし
- **ステータス**: [ ] 未修正

### M-17: NODE_ENVのAPI応答露出
- **ファイル**: `src/app/api/admin/backup/status/route.ts`
- **行**: 36
- **問題**: 環境情報を返却
- **ステータス**: [ ] 未修正

### M-18: Habitsの潜在的N+1
- **ファイル**: `src/app/api/habits/route.ts`
- **行**: 14-23
- **問題**: 30レコード×習慣数で大量データ
- **ステータス**: [ ] 未修正

### M-19: Cronログのユーザー情報露出
- **ファイル**: `src/app/api/cron/fitbit-sync/route.ts`
- **行**: 59, 73, 98, 112
- **問題**: userIdをログ出力
- **ステータス**: [ ] 未修正

### M-20: String型でのEnum代用
- **ファイル**: `prisma/schema.prisma`
- **行**: 74, 114, 152, 156, 243, 402
- **問題**: Prisma Enum未使用
- **ステータス**: [ ] 未修正

### M-21: updatedAt欠如
- **ファイル**: `prisma/schema.prisma`
- **行**: 229-238, 240-251, 291-309, 312-341, 344-368
- **問題**: 複数モデルでupdatedAtなし
- **ステータス**: [ ] 未修正

### M-22: 日付処理の不整合
- **ファイル**: `src/app/actions/health-record.ts`
- **行**: 104
- **問題**: タイムゾーン問題
- **ステータス**: [ ] 未修正

### M-23: バックグラウンド同期のエラーハンドリング
- **ファイル**: `src/app/actions/health-record.ts`
- **行**: 116-127
- **問題**: 失敗時のリトライなし
- **ステータス**: [ ] 未修正

### M-24: addSupplementのバリデーション欠如
- **ファイル**: `src/app/actions/supplements.ts`
- **行**: 41-78
- **問題**: 入力データ未検証
- **ステータス**: [ ] 未修正

### M-25: addSupplementのOrder競合
- **ファイル**: `src/app/actions/supplements.ts`
- **行**: 55-68
- **問題**: maxOrder取得と作成が非アトミック
- **ステータス**: [ ] 未修正

### M-26: 大きなJSONフィールドの制限なし
- **ファイル**: `prisma/schema.prisma`
- **行**: 333, 360
- **問題**: stages, intradayDataが無制限
- **ステータス**: [ ] 未修正

### M-27: JSON型安全性欠如
- **ファイル**: `src/app/actions/trends.ts`
- **行**: 76-82
- **問題**: @ts-ignoreでJSON型チェック回避
- **ステータス**: [ ] 未修正

### M-28: エラーメッセージの言語不統一
- **ファイル**: `src/app/actions/user.ts`
- **行**: 38
- **問題**: 日本語と英語が混在
- **ステータス**: [ ] 未修正

### M-29: 削除パターンの非効率
- **ファイル**: `src/app/actions/records.ts`
- **行**: 66-89
- **問題**: 取得後に削除（1クエリで可能）
- **ステータス**: [ ] 未修正

### M-30: NewsSection APIモック
- **ファイル**: `src/components/home/NewsSection.tsx`
- **行**: 22-31
- **問題**: setTimeoutでAPI模倣
- **ステータス**: [ ] 未修正

### M-31: 外部リンクのrel属性欠如
- **ファイル**: `src/components/home/VideoSection.tsx`
- **行**: 186-227
- **問題**: noopener noreferrerなし
- **ステータス**: [ ] 未修正

### M-32: orphanレコードの可能性
- **ファイル**: `prisma/schema.prisma`
- **行**: 229-238
- **問題**: InspectionItemAliasのカスケード確認
- **ステータス**: [ ] 未修正

### M-33: メモリ問題 - normalizeItemName
- **ファイル**: `src/app/actions/items.ts`
- **行**: 205
- **問題**: 全MasterItemをメモリロード
- **ステータス**: [ ] 未修正

### M-34: 外部キーインデックスパターン
- **ファイル**: `prisma/schema.prisma`
- **行**: 217
- **問題**: masterItemCodeの明示的インデックスなし
- **ステータス**: [ ] 未修正

### M-35: Toaster Position/z-index
- **ファイル**: `src/app/layout.tsx`
- **問題**: モーダルとの重なり
- **ステータス**: [ ] 未修正

### M-36: MobileNav Active State
- **ファイル**: `src/components/BottomNav.tsx`
- **問題**: 現在ページのハイライトなし
- **ステータス**: [ ] 未修正

### M-37: Skeleton Component統一
- **ファイル**: 複数コンポーネント
- **問題**: ローディング表示の不統一
- **ステータス**: [ ] 未修正

---

## Low Issues (23件)

### L-1: ハードコード - 非アクティブ閾値
- **ファイル**: `src/app/api/cron/fitbit-sync/route.ts`
- **行**: 24-27
- **問題**: INACTIVITY_THRESHOLD_DAYS = 10
- **ステータス**: [ ] 未修正

### L-2: ハードコード - Geminiモデル
- **ファイル**: `src/app/api/report/analyze/route.ts`
- **行**: 51-52
- **問題**: gemini-2.5-pro固定
- **ステータス**: [ ] 未修正

### L-3: URLにAPIキー
- **ファイル**: `src/app/api/report/analyze/route.ts`
- **行**: 52
- **問題**: ?key=でAPIキー渡し
- **ステータス**: [ ] 未修正

### L-4: リクエストID欠如
- **ファイル**: 全APIルート
- **問題**: ログ相関用ID未実装
- **ステータス**: [ ] 未修正

### L-5: エラー応答形式の不統一
- **ファイル**: 複数ファイル
- **問題**: {error} vs {success: false, error}
- **ステータス**: [ ] 未修正

### L-6: Cronの詳細結果返却
- **ファイル**: `src/app/api/cron/fitbit-sync/route.ts`
- **行**: 112-118
- **問題**: 全ユーザーIDを応答に含む
- **ステータス**: [ ] 未修正

### L-7: 開発用ハードコードメール
- **ファイル**: `src/lib/auth.ts`
- **行**: 14
- **問題**: ichiro0712@gmail.com固定
- **ステータス**: [ ] 未修正

### L-8: any型使用
- **ファイル**: `src/components/habits/HabitsPageClient.tsx`
- **行**: 11-14
- **問題**: any[]でprops定義
- **ステータス**: [ ] 未修正

### L-9: マジックナンバー - 長押し時間
- **ファイル**: `src/components/habits/HabitsClient.tsx`
- **行**: 186-189
- **問題**: 500ms固定
- **ステータス**: [ ] 未修正

### L-10: ハードコード - COLORS配列
- **ファイル**: `src/app/trends/page.tsx`
- **行**: 165
- **問題**: ローカル定義
- **ステータス**: [ ] 未修正

### L-11: @ts-ignore多用
- **ファイル**: `src/components/OcrUploader.tsx`
- **行**: 176, 191, 327, 378
- **問題**: 型安全性バイパス
- **ステータス**: [ ] 未修正

### L-12: ボタンスタイルの不統一
- **ファイル**: `src/components/LoginButton.tsx`
- **行**: 8-27
- **問題**: ハードコード色
- **ステータス**: [ ] 未修正

### L-13: console.log残存
- **ファイル**: `src/components/habits/SupplementsTab.tsx`
- **行**: 216, 224
- **問題**: 本番にデバッグログ
- **ステータス**: [ ] 未修正

### L-14: lang属性誤り
- **ファイル**: `src/app/layout.tsx`
- **行**: 45
- **問題**: lang="en"（日本語アプリ）
- **ステータス**: [ ] 未修正

### L-15: useMemo欠如
- **ファイル**: `src/app/trends/page.tsx`
- **行**: 145-153
- **問題**: allItems, filteredItemsの再計算
- **ステータス**: [ ] 未修正

### L-16: 未使用インポート
- **ファイル**: `src/app/page.tsx`
- **行**: 5
- **問題**: Heart, Moon, Sparkles
- **ステータス**: [ ] 未修正

### L-17: Headerの重複レンダリング
- **ファイル**: 複数ページ
- **問題**: 各ページでHeader個別インポート
- **ステータス**: [ ] 未修正

### L-18: エラーハンドリングの不統一
- **ファイル**: `src/components/OcrUploader.tsx`
- **行**: 86-88
- **問題**: toastとshowErrorToast混在
- **ステータス**: [ ] 未修正

### L-19: エクスポートパターン不統一
- **ファイル**: `src/components/home/NewsSection.tsx`
- **行**: 18
- **問題**: named vs default export
- **ステータス**: [ ] 未修正

### L-20: orderIndex初期値
- **ファイル**: `prisma/schema.prisma`
- **行**: 177
- **問題**: default 0で重複
- **ステータス**: [ ] 未修正

### L-21: String配列の非効率
- **ファイル**: `prisma/schema.prisma`
- **行**: 86, 139, 193, 257
- **問題**: 検索に非効率
- **ステータス**: [ ] 未修正

### L-22: DBコメント欠如
- **ファイル**: `prisma/schema.prisma`
- **問題**: ドキュメントコメントなし
- **ステータス**: [ ] 未修正

### L-23: OAuthトークン平文保存
- **ファイル**: `prisma/schema.prisma`
- **行**: 273-274
- **問題**: 暗号化なし
- **ステータス**: [ ] 未修正

---

## 修正進捗

| カテゴリ | 完了 | 残り | 進捗率 |
|---------|------|------|--------|
| Critical | 0 | 9 | 0% |
| High | 0 | 27 | 0% |
| Medium | 0 | 37 | 0% |
| Low | 0 | 23 | 0% |
| **合計** | **0** | **96** | **0%** |

---

## 修正順序（推奨）

### フェーズ1: セキュリティ・クリティカル（最優先）
1. C-1, C-2: Export APIアクセス制御
2. H-1: Cronジョブ認証
3. H-3, H-4: 機密ログ削除
4. H-24: バックアップからトークン除外

### フェーズ2: Next.js警告解消
5. C-3: viewport分離（全ページ）
6. L-14: lang="ja"

### フェーズ3: Error Handling
7. C-4: Error Boundary追加
8. M-14: エラーメッセージ汎化

### フェーズ4: パフォーマンス
9. C-5, C-6: saveHealthRecord最適化
10. H-15-H-19: DBインデックス追加
11. H-20: getTrendsData並列化
12. H-14: Recharts動的インポート

### フェーズ5: 型安全性
13. H-25: next-auth型拡張
14. C-8, C-9: 入力バリデーション（Zod）

### フェーズ6: UI/UX改善
15. H-7-H-10: Next.js Image
16. H-11-H-13: アクセシビリティ
17. M-1-M-11: モーダル・ローディング改善

### フェーズ7: その他
18. 残りのMedium/Low Issues
