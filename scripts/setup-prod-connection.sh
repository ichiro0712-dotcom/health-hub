#!/bin/bash
# 本番DBへの接続を簡単セットアップ

echo "🚀 本番DB接続セットアップ"
echo ""

# Vercelから環境変数を自動取得
echo "📥 Vercelから環境変数を取得中..."
vercel env pull .env.production.local --yes 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ 環境変数を取得しました"
    
    # .env.localに上書き
    cp .env.production.local .env.local
    echo "✅ 本番DB接続を有効にしました"
    echo ""
    echo "🎉 完了！これでローカルの変更が本番DBに反映されます"
    echo ""
    echo "開発サーバーを起動: npm run dev"
else
    echo "❌ Vercelへのログインが必要です"
    echo ""
    echo "以下のコマンドを実行してください:"
    echo "  vercel login"
    echo "  npm run setup-prod"
fi
