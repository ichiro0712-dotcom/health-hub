#!/bin/bash
# ローカルDBに戻す

echo "🔄 ローカルDBモードに切り替え中..."

# バックアップが存在する場合は復元
if [ -f .env.local.backup ]; then
    cp .env.local.backup .env.local
    echo "✅ ローカルDBモードに戻しました"
    rm .env.local.backup
else
    echo "⚠️  バックアップファイルが見つかりません"
    echo "📝 手動で .env.local を編集してください"
fi
