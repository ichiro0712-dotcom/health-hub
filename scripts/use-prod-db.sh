#!/bin/bash
# 本番DBに接続してローカル開発する

echo "🔄 本番DBモードに切り替え中..."

# .env.production.localが存在しない場合は警告
if [ ! -f .env.production.local ]; then
    echo "❌ .env.production.local が見つかりません"
    echo "📝 .env.production.local.example を参考に .env.production.local を作成してください"
    exit 1
fi

# .env.local を .env.local.backup にバックアップ
if [ -f .env.local ]; then
    cp .env.local .env.local.backup
    echo "📦 .env.local を .env.local.backup にバックアップしました"
fi

# .env.production.local を .env.local にコピー
cp .env.production.local .env.local
echo "✅ 本番DBモードに切り替えました"
echo "⚠️  注意: ローカルの変更が本番DBに直接反映されます"
echo ""
echo "🔙 元に戻すには: npm run use-local-db"
