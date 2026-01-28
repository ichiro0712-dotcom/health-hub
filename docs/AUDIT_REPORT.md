# Health Hub システム監査レポート

**監査日**: 2026-01-28
**監査者**: システム責任者
**対象**: Next.js Health Hub プロジェクト全体

---

## 1. エグゼクティブサマリー

| 深刻度 | 件数 | 即時対応 |
|--------|------|----------|
| 🔴 CRITICAL | 5件 | 必須 |
| 🟡 HIGH | 12件 | 1週間以内 |
| 🟢 MEDIUM | 10件 | 2週間以内 |

**総合評価**: セキュリティ上の重大な問題が複数存在。本番環境への影響を最小限にするため、CRITICAL項目の即時対応が必要。

---

## 2. CRITICAL（即時対応必須）

### 2.1 認証情報の漏洩リスク

**ファイル**: `.env`, `google-service-account.json`

**問題**:
- データベース認証情報、APIキー、OAuth認証情報がリポジトリに含まれている可能性
- Google Service Account 認証情報ファイルがバージョン管理対象

**影響**:
- 本番データベースへの不正アクセス
- ユーザーのGoogle Docsデータへの無制限アクセス

**修正方法**:
```bash
# .gitignore に追加
.env
.env.local
.env.production*
google-service-account.json
```

### 2.2 Admin Backup Import エンドポイントの認可不備

**ファイル**: `src/app/api/admin/backup/import/route.ts:23-27`

**問題**:
```typescript
if (process.env.NODE_ENV === 'production') {
    // 本番環境では管理者のみ許可するロジックを追加
    // 現時点では開発環境のみ許可  ← 未実装
}
```

**影響**: 認証済みユーザーなら誰でもデータベース全体をインポート・上書き可能

**修正方法**: 管理者認可を実装

### 2.3 PrismaClient のインスタンス重複生成

**ファイル**: `src/app/actions/records.ts:9`

**問題**:
```typescript
const prisma = new PrismaClient();  // 毎回新規作成
```

**影響**: 接続プール枯渇、パフォーマンス劣化

**修正方法**:
```typescript
import prisma from "@/lib/prisma";  // singleton使用
```

### 2.4 Google Docs API ファイルシステム依存

**ファイル**: `src/lib/google-docs.ts:22-26`

**問題**:
```typescript
const keyFilePath = path.join(process.cwd(), 'google-service-account.json');
if (!fs.existsSync(keyFilePath)) { throw new Error(...); }
```

**影響**: Vercel等のサーバーレス環境でデプロイ失敗

**修正方法**: 環境変数のみで認証

### 2.5 CredentialsProvider の本番環境漏洩リスク

**ファイル**: `src/lib/auth.ts:24-26`

**問題**: `NODE_ENV` チェックは偽装可能

**修正方法**: 本番環境ではCredentialsProviderを登録しない

---

## 3. HIGH（1週間以内に対応）

### 3.1 型安全性: 広範な `any` 型使用

**ファイル**: `src/app/actions/items.ts` 等

**問題箇所**:
- 行76, 81, 101, 110, 157: `data as any`, `r as any`

**修正方法**: 明示的なinterface定義

### 3.2 N+1 クエリ問題

**ファイル**: `src/app/actions/items.ts:285-309`

**問題**:
```typescript
for (const alias of victimsAliases) {
    await prisma.inspectionItemAlias.update({...});  // ループ内で1件ずつ
}
```

**修正方法**: `updateMany` でバッチ処理

### 3.3 日付処理のタイムゾーン問題

**ファイル**: `src/lib/fitbit/sync.ts:44-47`

**問題**: タイムゾーン未考慮で日付がズレる可能性

**修正方法**: date-fns-tz 等でタイムゾーン明示

### 3.4 エラーハンドリング不備

**ファイル**: `src/app/actions/ocr.ts:99-101`

**問題**: `JSON.parse()` の例外処理不十分

**修正方法**: try-catch で詳細エラーメッセージ

### 3.5 Promise が待機されていない

**ファイル**: `src/app/actions/health-record.ts:117-125`

**問題**:
```typescript
prisma.healthRecord.findMany({...}).then(records => {
    syncRecordsToGoogleDocs(records).catch(...);  // await なし
});
```

**修正方法**: 明示的に await

### 3.6 入力値バリデーション不備

**ファイル**: 複数

**問題**: JSON データの無検証な保存

**修正方法**: zod 等でスキーマバリデーション

### 3.7 XSS 脆弱性

**ファイル**: `src/lib/google-docs.ts`

**問題**: ユーザー入力がサニタイズなしで Google Docs に挿入

**修正方法**: ユーザーテキストのエスケープ処理

### 3.8 Magic Numbers/Strings の多用

**ファイル**: 複数

**問題**:
- `DEFAULT_SYNC_DAYS = 7` がハードコード
- `'pending'`, `'verified'`, `'yes_no'` 等が文字列リテラル

**修正方法**: 定数/enum で定義

### 3.9 セッションからの email 使用

**ファイル**: 複数の Server Actions

**問題**: `session.user.email` でユーザー検索（email改ざんリスク）

**修正方法**: NextAuth の session に user.id を含め、id で検索

---

## 4. MEDIUM（2週間以内に対応）

### 4.1 HealthRecordForm の複雑さ

**ファイル**: `src/components/HealthRecordForm.tsx`

**問題**: 800行を超える巨大コンポーネント

**修正方法**: 5-6個の小コンポーネントに分割

### 4.2 重複コード

**ファイル**: 複数の Server Actions

**問題**: 同じバリデーション・ユーザー検索が重複

**修正方法**: 共通関数を `src/lib/validation.ts` に作成

### 4.3 不要な再レンダリング

**ファイル**: `src/components/HealthRecordForm.tsx`

**問題**: 大量の個別 useState

**修正方法**: 単一の状態オブジェクトで管理

### 4.4 メモリリーク

**ファイル**: `src/components/HealthRecordForm.tsx:294-299`

**問題**: `URL.createObjectURL` の参照を解放しない

**修正方法**: `URL.revokeObjectURL()` を呼び出す

### 4.5 エラーメッセージの不統一

**ファイル**: 複数

**問題**: 「Unauthorized」vs「User not found」等

**修正方法**: 統一されたエラーレスポンスフォーマット

### 4.6 コメント言語の混在

**問題**: 日本語と英語が混在

**修正方法**: プロジェクト全体で統一

### 4.7 API レート制限なし

**問題**: Fitbit sync, Google Docs操作等にレート制限がない

**修正方法**: rate-limit ミドルウェア実装

### 4.8 ロギング戦略の欠如

**問題**: `console.error()` が多用、構造化ログなし

**修正方法**: winston/pino 等でロガー実装

### 4.9 テスト戦略がない

**問題**: テストファイルが存在しない

**修正方法**: Jest/Vitest + Playwright でテスト作成

### 4.10 JSON フィールドの型安全性欠如

**問題**: `HealthRecord.data` 等が無制約の Json 型

**修正方法**: interface 定義 + runtime バリデーション

---

## 5. 対応優先順序

| 順序 | 問題 | 深刻度 | 推定時間 |
|------|------|--------|----------|
| 1 | .gitignore 更新 + キーローテーション | CRITICAL | 1時間 |
| 2 | Admin Import エンドポイント認可実装 | CRITICAL | 2時間 |
| 3 | PrismaClient singleton 修正 | CRITICAL | 30分 |
| 4 | Google Docs API 環境変数対応 | CRITICAL | 1時間 |
| 5 | CredentialsProvider 本番除外 | CRITICAL | 30分 |
| 6 | any 型を interface に置換 | HIGH | 3時間 |
| 7 | N+1 クエリ修正 | HIGH | 2時間 |
| 8 | エラーハンドリング統一 | HIGH | 2時間 |
| 9 | 入力値バリデーション追加 | HIGH | 3時間 |
| 10 | コンポーネント分割 | MEDIUM | 4時間 |

---

## 6. 修正チェックリスト

### CRITICAL
- [x] `.gitignore` に認証情報ファイルを追加 ✅ 既に設定済み
- [ ] 全APIキーをローテーション（手動作業）
- [x] Admin Import に管理者認可実装 ✅ 修正完了
- [x] `records.ts` で singleton PrismaClient 使用 ✅ 修正完了
- [x] Google Docs API を環境変数のみに変更 ✅ 既に対応済み
- [x] 本番環境で CredentialsProvider を除外 ✅ 修正完了

### HIGH
- [x] `any` 型を明示的 interface に置換 ✅ items.ts 修正完了
- [x] `mergeItems` の N+1 クエリ修正 ✅ updateMany に変更
- [x] `JSON.parse` のエラーハンドリング追加 ✅ ocr.ts 修正完了
- [x] Promise の適切な await 追加 ✅ health-record.ts 修正完了
- [x] zod によるバリデーション追加 ✅ schemas.ts 作成
- [x] Google Docs テキストサニタイズ ✅ sanitizeForGoogleDocs 実装
- [x] Magic Numbers を定数化 ✅ constants.ts 作成
- [x] session.user.id でユーザー検索 ✅ 全Server Actions/API修正完了

### MEDIUM
- [ ] HealthRecordForm を分割
- [x] 共通バリデーション関数作成 ✅ validation.ts 作成
- [ ] useState 統合
- [x] `URL.revokeObjectURL` 追加 ✅ 全コンポーネント修正完了
- [x] エラーメッセージ統一 ✅ constants.ts に ERROR_MESSAGES 定義
- [x] ロガー実装 ✅ logger.ts 作成
- [ ] テストスイート作成

---

## 7. 修正サマリー（2026-01-28 最終更新）

### 完了した修正

**CRITICAL（5件中4件完了）**:
1. ✅ Admin Import エンドポイントに管理者認可（ADMIN_EMAILS 環境変数）を実装
2. ✅ records.ts で PrismaClient singleton を使用するよう修正
3. ✅ 本番環境で CredentialsProvider を完全に除外するよう修正
4. ✅ .gitignore は既に適切に設定されていることを確認

**HIGH（8件中8件完了）**:
1. ✅ items.ts の any 型を明示的な interface に置換
2. ✅ mergeItems の N+1 クエリを updateMany でバッチ処理に修正
3. ✅ ocr.ts の JSON.parse エラーハンドリングを強化
4. ✅ health-record.ts の Promise 処理を適切な非同期実行に修正
5. ✅ constants.ts を作成し Magic Numbers/Strings を定数化
6. ✅ 不要なデバッグコードを削除
7. ✅ schemas.ts を作成し zod によるスキーマバリデーションを実装
8. ✅ google-docs.ts に sanitizeForGoogleDocs を実装（XSS対策）
9. ✅ 全 Server Actions/API で session.user.id によるユーザー検索に変更（セキュリティ向上）

**MEDIUM（7件中5件完了）**:
1. ✅ validation.ts を作成し共通バリデーション関数を実装
2. ✅ ERROR_MESSAGES を定数化
3. ✅ URL.revokeObjectURL を全コンポーネントに追加（メモリリーク対策）
4. ✅ logger.ts を作成し構造化ロガーを実装
5. ✅ dashboard.ts, export.ts, user.ts で PrismaClient singleton を使用するよう修正

### 残りの作業

**手動作業が必要**:
- [ ] 全APIキーのローテーション（セキュリティ上推奨）

**追加実装が必要**:
- [ ] HealthRecordForm のコンポーネント分割（大規模リファクタリング）
- [ ] useState 統合（HealthRecordForm内）
- [ ] テストスイート作成

**次のステップ**: HealthRecordForm の分割とテスト作成を検討。
