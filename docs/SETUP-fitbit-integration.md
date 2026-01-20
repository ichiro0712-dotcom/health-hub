# Fitbit Web API 統合 - セットアップガイド

## 概要

このドキュメントでは、Health HubアプリにFitbit Web APIを統合するための設定手順を説明します。

## 前提条件

- Fitbit開発者アカウント
- Fitbitデバイス（Fitbit Charge, Sense, Versaなど）
- PostgreSQLデータベース

## ステップ1: Fitbit開発者アプリの作成

### 1.1 Fitbit Developer Portalにアクセス

1. [https://dev.fitbit.com/](https://dev.fitbit.com/) にアクセス
2. Fitbitアカウントでログイン
3. 「Manage > Register An App」をクリック

### 1.2 アプリケーション登録

以下の情報を入力:

| フィールド | 値 |
|-----------|-----|
| Application Name | Health Hub |
| Description | Personal health data aggregation app |
| Application Website URL | https://your-domain.com |
| Organization | (個人利用の場合は空白可) |
| Organization Website URL | (個人利用の場合は空白可) |
| Terms of Service URL | https://your-domain.com/terms |
| Privacy Policy URL | https://your-domain.com/privacy |
| OAuth 2.0 Application Type | **Personal** (開発/個人利用) or **Server** (商用) |
| Redirect URI | http://localhost:3000/api/fitbit/callback |
| Default Access Type | Read-Only |

### 1.3 OAuth 2.0 Client ID と Secret を取得

登録後、以下の情報が表示されます:
- **OAuth 2.0 Client ID**
- **Client Secret**

これらを安全に保存してください。

## ステップ2: 環境変数の設定

`.env.local` ファイルに以下を追加:

```bash
# Fitbit OAuth Configuration
FITBIT_CLIENT_ID=your_client_id_here
FITBIT_CLIENT_SECRET=your_client_secret_here
FITBIT_REDIRECT_URI=http://localhost:3000/api/fitbit/callback

# Production環境では以下のように設定
# FITBIT_REDIRECT_URI=https://your-domain.com/api/fitbit/callback
```

## ステップ3: データベースマイグレーション

新しいFitbit関連テーブルを作成:

```bash
# マイグレーション生成
npx prisma migrate dev --name add_fitbit_integration

# または本番環境では
npx prisma migrate deploy
```

### 追加されるテーブル

1. **FitbitAccount** - Fitbit OAuthトークン管理
2. **HrvData** - 心拍変動データ
3. **DetailedSleep** - 詳細睡眠ステージ
4. **IntradayHeartRate** - 秒単位心拍数

## ステップ4: アプリケーション起動

```bash
npm run dev
```

## 使用方法

### Fitbit連携

1. アプリにログイン
2. 設定 > Fitbit連携 (/settings/fitbit) に移動
3. 「Fitbitと連携する」ボタンをクリック
4. Fitbitの認証画面でアプリを承認
5. 自動的にアプリに戻り、連携完了

### データ同期

- 設定画面から「今すぐ同期」をクリック
- デフォルトで過去7日間のデータを同期
- 同期されるデータ:
  - 歩数・活動データ
  - 心拍数（イントラデイ）
  - HRV（心拍変動）
  - 睡眠ステージ
  - 呼吸数
  - 皮膚温度
  - 体重

## API エンドポイント

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/fitbit/auth` | GET | OAuth認証開始 |
| `/api/fitbit/callback` | GET | OAuthコールバック |
| `/api/fitbit/status` | GET | 連携状態確認 |
| `/api/fitbit/sync` | POST | データ同期実行 |
| `/api/fitbit/disconnect` | DELETE | 連携解除 |

## トラブルシューティング

### 「redirect_uri_mismatch」エラー

Fitbit Developer Portalに登録したRedirect URIと、環境変数`FITBIT_REDIRECT_URI`が完全に一致しているか確認してください。

### トークン期限切れ

アクセストークンは8時間で期限切れになります。アプリは自動的にリフレッシュトークンを使用して更新します。リフレッシュが失敗した場合は、再連携が必要です。

### データが取得できない

- Fitbitアプリでデータが同期されているか確認
- 要求したスコープがユーザーに承認されているか確認
- API制限（1時間あたり150リクエスト）に達していないか確認

## データ優先順位

| データ種別 | 優先ソース | 理由 |
|-----------|-----------|------|
| 歩数 | Fitbit | イントラデイデータあり |
| 心拍数 | Fitbit | 秒単位データあり |
| 睡眠 | Fitbit | ステージ詳細あり |
| HRV | Fitbit | Health Connectでは取得困難 |
| 体重 | Health Connect | 他社体重計対応 |
| 血圧 | Health Connect | Fitbit非対応 |

## セキュリティ考慮事項

- トークンはデータベースに暗号化せずに保存されています
- 本番環境では、トークンの暗号化を検討してください
- HTTPS必須（本番環境）
- CSRFトークン（stateパラメータ）で保護

## 参考リンク

- [Fitbit Web API Documentation](https://dev.fitbit.com/build/reference/web-api/)
- [OAuth 2.0 Tutorial](https://dev.fitbit.com/build/reference/web-api/developer-guide/authorization/)
- [Intraday Data Access](https://dev.fitbit.com/build/reference/web-api/intraday/)
