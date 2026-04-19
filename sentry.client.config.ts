import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring: 10% サンプリング(Free tier 節約)
  tracesSampleRate: 0.1,

  // エラーはすべて送る
  sampleRate: 1.0,

  // 開発環境では送信しない
  enabled: process.env.NODE_ENV === 'production',

  // デバッグ出力なし
  debug: false,

  // ユーザーの PII は送らない
  sendDefaultPii: false,
})
