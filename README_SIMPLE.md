# 超簡単！本番データで開発する方法

## 🎯 やりたいこと

ローカル（自分のPC）で開発しながら、本番のデータベースを直接使いたい。
→ ローカルで入力したら、本番サイトにも即座に反映される！

## 📝 手順（初回のみ）

### 1. 一度だけセットアップ

```bash
npm run setup-prod
```

これで完了！本番DBに接続されます。

### 2. 開発開始

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く

→ **ここで入力・変更したデータが本番にも反映される！**

## ⚠️ 注意点

- **データを削除したら本番からも消える**
- 慎重に操作してください

## 🔄 元に戻す（ローカルDBに戻す）

```bash
npm run use-local-db
npm run dev
```

## 💡 実際の使い方

### パターン1: 本番データで開発（推奨）

```bash
# 1. 本番DB接続（初回のみ）
npm run setup-prod

# 2. 開発サーバー起動
npm run dev

# 3. ローカル（localhost:3000）で作業
#    → 入力したデータが本番サイト（health-hub-eight.vercel.app）にも即座に反映！

# 4. 完了後は特に何もしなくてOK
#    次回も同じ設定で起動します
```

### パターン2: テスト用にローカルDBを使う

```bash
# ローカルDBに切り替え
npm run use-local-db

# 開発サーバー起動
npm run dev

# ローカルでテスト（本番に影響なし）
```

## 🔍 今どっちに接続してる？

```bash
# Prisma Studioで確認
npx prisma studio
```

- **本番DB**: テーブルに実際のユーザーデータが見える
- **ローカルDB**: テーブルが空 or テストデータのみ

## ❓ トラブルシューティング

### 「Vercelへのログインが必要です」と出た

```bash
vercel login
# ブラウザでログイン後
npm run setup-prod
```

### データが反映されない

開発サーバーを再起動：

```bash
# Ctrl+C で止める
npm run dev
```

### 本当に本番DBに接続されてる？

```bash
cat .env.local | grep DATABASE_URL
```

→ `pooler.supabase.com` が含まれていればOK
