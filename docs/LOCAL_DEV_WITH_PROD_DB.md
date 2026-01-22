# 本番DBに接続してローカル開発する方法

ローカル開発環境から本番Supabase DBに接続して、本番データを使って開発する手順です。

## ⚠️ 重要な注意事項

- **本番DBに直接接続するため、ローカルの変更が本番に即座に反映されます**
- データ削除やスキーマ変更は本番環境に影響します
- 開発時は細心の注意を払ってください

## 📋 前提条件

- Supabaseプロジェクトへのアクセス権限
- 本番環境の環境変数情報

## 🔧 セットアップ手順

### 1. 設定ファイルを作成

`.env.production.local.example`を参考に`.env.production.local`を作成：

```bash
cp .env.production.local.example .env.production.local
```

### 2. Supabase接続情報を取得

1. [Supabase Dashboard](https://supabase.com/dashboard)にアクセス
2. プロジェクトを選択
3. **Settings** → **Database**
4. **Connection string**セクションで**Transaction**モードの接続文字列をコピー
5. パスワード部分を実際のパスワードに置き換える

```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

### 3. 環境変数を設定

`.env.production.local`を編集：

```env
# Database
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# NextAuth
NEXTAUTH_URL="https://health-hub-eight.vercel.app"
NEXTAUTH_SECRET="[Vercelの環境変数から取得]"

# Google OAuth
GOOGLE_CLIENT_ID="[Vercelの環境変数から取得]"
GOOGLE_CLIENT_SECRET="[Vercelの環境変数から取得]"

# Google AI
GOOGLE_API_KEY="[Vercelの環境変数から取得]"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="[Vercelの環境変数から取得]"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[Vercelの環境変数から取得]"
SUPABASE_SERVICE_ROLE_KEY="[Vercelの環境変数から取得]"
```

### 4. 環境変数をVercelから取得

```bash
# Vercelの環境変数一覧を表示
vercel env ls

# 特定の環境変数を取得（例）
vercel env pull .env.vercel
```

## 🚀 使用方法

### 本番DBモードに切り替え

```bash
npm run use-prod-db
```

開発サーバーを起動：

```bash
npm run dev
```

### ローカルDBモードに戻す

```bash
npm run use-local-db
```

## 🔍 確認方法

接続しているDBを確認：

```bash
# Prisma Studioで確認
npx prisma studio

# または、SQLで確認
psql $DATABASE_URL -c "SELECT current_database(), inet_server_addr(), inet_server_port();"
```

## 💡 開発フロー例

### パターン1: 本番データで開発

```bash
# 1. 本番DBに切り替え
npm run use-prod-db

# 2. 開発サーバー起動
npm run dev

# 3. ローカル（http://localhost:3000）で開発
# → 変更は本番DBに即座に反映

# 4. 完了後、ローカルDBに戻す
npm run use-local-db
```

### パターン2: 本番データをローカルにコピー

```bash
# 1. 本番DBのデータをエクスポート
npm run use-prod-db
node scripts/export-prod-data.js > data.json

# 2. ローカルDBに戻す
npm run use-local-db

# 3. ローカルDBにインポート
node scripts/import-data.js < data.json

# 4. ローカルで安全に開発
npm run dev
```

## ⚙️ トラブルシューティング

### 接続エラー

```
Error: P1001: Can't reach database server
```

**解決策**:
- DATABASE_URLが正しいか確認
- Supabaseプロジェクトが稼働中か確認
- IPアドレス制限がある場合は許可リストに追加

### 認証エラー

```
Error: password authentication failed
```

**解決策**:
- データベースパスワードが正しいか確認
- 特殊文字がURLエンコードされているか確認

### スキーマ不一致

```
Prisma schema is out of sync with the database
```

**解決策**:
```bash
# スキーマを同期
npx prisma db push

# または、マイグレーション適用
npx prisma migrate deploy
```

## 🔒 セキュリティ

- `.env.production.local`は**絶対にGitにコミットしない**
- `.gitignore`で除外されていることを確認：
  ```
  .env*.local
  ```

## 📚 参考リンク

- [Supabase Database Settings](https://supabase.com/dashboard/project/_/settings/database)
- [Prisma Connection Management](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
