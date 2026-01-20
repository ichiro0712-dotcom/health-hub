# Ichiro Health - システム仕様書

**バージョン**: 1.0.0
**最終更新**: 2026-01-04
**プロジェクト名**: health-hub (Ichiro Health / ヘルヘルス)

---

## 1. システム概要

### 1.1 目的
Ichiro Healthは、複数のソースからの健康データを統合・可視化する個人向け健康管理プラットフォームです。

### 1.2 主な機能
- 病院の健康診断結果のOCR取り込み・管理
- Fitbit/Health Connectからのフィットネスデータ自動同期
- 健康数値のトレンド分析・グラフ表示
- 生活習慣・サプリメントの記録管理
- データのエクスポート・バックアップ

### 1.3 対象ユーザー
- 個人の健康管理を行いたいユーザー
- 複数の健康データソースを一元管理したいユーザー
- 健康診断結果の経年変化を追跡したいユーザー

---

## 2. 技術スタック

### 2.1 フロントエンド
| 技術 | バージョン | 用途 |
|------|-----------|------|
| Next.js | 16.1.1 | フレームワーク (App Router) |
| React | 19.2.3 | UIライブラリ |
| TypeScript | 5.x | 型安全な開発 |
| Tailwind CSS | 4.x | スタイリング |
| Recharts | 3.6.0 | グラフ描画 |
| Chart.js | 4.5.1 | ダッシュボードチャート |
| Lucide React | 0.562.0 | アイコン |

### 2.2 バックエンド
| 技術 | バージョン | 用途 |
|------|-----------|------|
| Next.js API Routes | - | RESTful API |
| Server Actions | - | サーバーサイドロジック |
| Prisma ORM | 5.22.0 | データベースアクセス |
| PostgreSQL | - | データベース |
| NextAuth | 4.24.13 | 認証 |

### 2.3 外部サービス
| サービス | 用途 |
|----------|------|
| Google OAuth | ユーザー認証 |
| Google Gemini API | OCR・テキスト解析 |
| Fitbit API | フィットネスデータ取得 |
| Health Connect | Android健康データ取得 |
| Supabase | 画像ストレージ |

### 2.4 モバイル
| 技術 | バージョン | 用途 |
|------|-----------|------|
| Capacitor | 8.0.0 | ネイティブアプリ化 |
| capacitor-health-connect | 0.7.0 | Health Connect連携 |

---

## 3. システムアーキテクチャ

### 3.1 全体構成図
```
┌─────────────────────────────────────────────────────────────────┐
│                        クライアント層                            │
├─────────────────────────────────────────────────────────────────┤
│  Web Browser          │  Android App (Capacitor)                │
│  - Next.js Pages      │  - Health Connect Plugin                │
│  - React Components   │  - Native UI Shell                      │
└───────────┬───────────┴───────────────┬─────────────────────────┘
            │                           │
            ▼                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      アプリケーション層                          │
├─────────────────────────────────────────────────────────────────┤
│  Next.js Server                                                 │
│  ├── API Routes (/api/*)                                        │
│  ├── Server Actions (actions/*.ts)                              │
│  └── Authentication (NextAuth)                                  │
└───────────┬─────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        データ層                                  │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (Prisma ORM)     │  Supabase Storage                │
│  - ユーザーデータ             │  - 健康診断画像                   │
│  - 健康記録                   │                                   │
│  - フィットネスデータ         │                                   │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      外部サービス層                              │
├─────────────────────────────────────────────────────────────────┤
│  Fitbit API    │  Google Gemini    │  Google OAuth              │
│  - HRV         │  - OCR処理        │  - 認証                    │
│  - 睡眠        │  - テキスト解析   │                             │
│  - 心拍        │                   │                             │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 データフロー

#### 健康診断データ取り込み
```
画像アップロード → Gemini OCR → データ正規化 → DB保存 → UI表示
                         ↓
                 項目名マッピング (MasterItem)
                         ↓
                 InspectionItem + Alias作成
```

#### Fitbitデータ同期
```
ページアクセス → 同期チェック → 24時間以上経過？
                                    ↓ Yes
                              Fitbit API呼び出し
                                    ↓
                              データ変換・保存
                                    ↓
                              lastSyncedAt更新
```

---

## 4. データベース設計

### 4.1 ER図 (主要テーブル)
```
User ─────────────────────────────────────────────────────────────
  │
  ├── Account (OAuth連携)
  ├── Session (セッション管理)
  │
  ├── HealthRecord (健康診断記録)
  │     └── data: JSON {results: [{item, value, unit}]}
  │
  ├── FitData (日次フィットネスデータ)
  │     └── source: 'fitbit' | 'health_connect'
  │
  ├── FitbitAccount (Fitbit OAuth)
  │     ├── lastSyncedAt
  │     └── initialSyncCompleted
  │
  ├── HrvData (心拍変動)
  ├── DetailedSleep (睡眠詳細)
  ├── IntradayHeartRate (分単位心拍)
  │
  ├── LifestyleHabit (生活習慣)
  ├── Supplement (サプリメント)
  │
  ├── InspectionItem (検査項目)
  │     ├── InspectionItemAlias (別名)
  │     └── InspectionItemHistory (変更履歴)
  │
  └── UserHealthItemSetting (表示設定)
```

### 4.2 主要テーブル詳細

#### User
| カラム | 型 | 説明 |
|--------|-----|------|
| id | String (CUID) | 主キー |
| name | String? | 表示名 |
| email | String (Unique) | メールアドレス |
| birthDate | DateTime? | 生年月日 |
| image | String? | プロフィール画像URL |

#### HealthRecord
| カラム | 型 | 説明 |
|--------|-----|------|
| id | String (CUID) | 主キー |
| userId | String | ユーザーID (FK) |
| date | DateTime | 検査日 |
| status | String | 'pending' / 'verified' |
| data | JSON | 検査結果データ |
| images | String[] | 画像URL配列 |
| title | String? | タイトル |
| summary | String? | 概要 |

#### FitData
| カラム | 型 | 説明 |
|--------|-----|------|
| id | String (CUID) | 主キー |
| userId | String | ユーザーID (FK) |
| date | DateTime | 日付 |
| steps | Int? | 歩数 |
| heartRate | Float? | 心拍数 |
| weight | Float? | 体重 |
| sleepMinutes | Int? | 睡眠時間(分) |
| calories | Float? | 消費カロリー |
| source | String? | データソース |

#### FitbitAccount
| カラム | 型 | 説明 |
|--------|-----|------|
| id | String (CUID) | 主キー |
| userId | String (Unique) | ユーザーID (FK) |
| fitbitUserId | String | FitbitユーザーID |
| accessToken | String | アクセストークン |
| refreshToken | String | リフレッシュトークン |
| expiresAt | DateTime | トークン有効期限 |
| lastSyncedAt | DateTime? | 最終同期日時 |
| initialSyncCompleted | Boolean | 初回同期完了フラグ |

---

## 5. API仕様

### 5.1 認証API

#### POST /api/auth/[...nextauth]
NextAuth.jsの認証エンドポイント

**対応プロバイダー**:
- Google OAuth 2.0

### 5.2 Fitbit API

#### POST /api/fitbit/auth
Fitbit OAuth認証開始

**レスポンス**:
```json
{
  "authUrl": "https://www.fitbit.com/oauth2/authorize?..."
}
```

#### GET /api/fitbit/callback
OAuth コールバック処理

**クエリパラメータ**:
- `code`: 認証コード
- `state`: CSRF保護用ステート

#### GET /api/fitbit/status
接続状態確認

**レスポンス**:
```json
{
  "connected": true,
  "fitbitUserId": "ABC123",
  "lastSyncedAt": "2026-01-04T10:00:00Z",
  "initialSyncCompleted": true
}
```

#### POST /api/fitbit/sync
手動同期トリガー

**リクエストボディ**:
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-01-04",
  "dataTypes": ["activity", "heartrate", "sleep"]
}
```

#### POST /api/fitbit/disconnect
Fitbit接続解除

### 5.3 Health Connect API

#### POST /api/v1/health-connect/sync
モバイルアプリからの健康データ同期

**リクエストボディ**:
```json
{
  "date": "2026-01-04T00:00:00Z",
  "data": {
    "steps": 8500,
    "distance": 6200,
    "calories": 350,
    "heartRate": 72,
    "weight": 65.5,
    "sleepMinutes": 420,
    "vitals": {
      "bloodPressure": [...],
      "bodyTemperature": [...],
      "oxygenSaturation": [...]
    }
  }
}
```

### 5.4 Cron API

#### GET /api/cron/fitbit-sync
非アクティブユーザーの自動同期

**認証**: Bearer Token (CRON_SECRET)

**動作**:
- 10日以上同期していないユーザーを検索
- 最大20ユーザー/回で差分同期実行

### 5.5 バックアップAPI

#### POST /api/admin/backup/export
データエクスポート

#### POST /api/admin/backup/import
データインポート

---

## 6. Server Actions

### 6.1 健康記録関連

| アクション | 説明 |
|-----------|------|
| `saveHealthRecord(data)` | 健康診断記録の保存 |
| `getRecords()` | 記録一覧取得 |
| `getRecordById(id)` | 記録詳細取得 |
| `deleteRecord(id)` | 記録削除 |

### 6.2 OCR・解析関連

| アクション | 説明 |
|-----------|------|
| `processHealthCheckDocuments(urls)` | 画像からOCR処理 |
| `parseHealthCheckText(text)` | テキストから解析 |

### 6.3 ダッシュボード・トレンド

| アクション | 説明 |
|-----------|------|
| `getDashboardData()` | ダッシュボードデータ取得 |
| `getTrendsData()` | トレンド分析データ取得 |

### 6.4 Fitbit同期

| アクション | 説明 |
|-----------|------|
| `getFitbitSyncStatus()` | 同期状態確認 |
| `triggerAutoSync()` | 自動同期トリガー |
| `manualFitbitSync(days)` | 手動同期実行 |

### 6.5 設定・マスタ

| アクション | 説明 |
|-----------|------|
| `getUserItemSettings()` | 項目設定取得 |
| `getUniqueItems()` | ユニーク項目一覧 |
| `getItemMappings()` | 項目名マッピング取得 |

### 6.6 生活習慣・サプリ

| アクション | 説明 |
|-----------|------|
| `getLifestyleHabits()` | 生活習慣取得 |
| `saveLifestyleHabit(data)` | 生活習慣保存 |
| `getSupplements()` | サプリメント取得 |
| `saveSupplement(data)` | サプリメント保存 |

---

## 7. ページ構成

### 7.1 ルーティング

| パス | ページ名 | 説明 |
|------|---------|------|
| `/` | ダッシュボード | 健康サマリー・最新データ |
| `/records` | 健康記録一覧 | 病院データ一覧 |
| `/records/[id]` | 記録詳細 | 個別記録の詳細表示 |
| `/trends` | トレンド分析 | 数値の経年変化グラフ |
| `/habits` | 生活習慣 | 習慣・サプリ管理 |
| `/import` | データ取り込み | OCR・手動入力 |
| `/profile` | プロフィール | ユーザー設定 |
| `/settings` | 設定 | アプリ設定 |
| `/settings/fitbit` | Fitbit設定 | Fitbit連携管理 |
| `/settings/data-sync` | 同期設定 | 同期間隔設定 |

### 7.2 コンポーネント構成

```
src/components/
├── Header.tsx              # ヘッダー
├── BottomNav.tsx           # モバイル下部ナビ
├── Providers.tsx           # Context Provider
├── AutoSyncProvider.tsx    # 自動同期
├── LoginButton.tsx         # ログインボタン
├── DashboardCharts.tsx     # ダッシュボードチャート
├── TrendCharts.tsx         # トレンドチャート
├── RecordCard.tsx          # 記録カード
├── HealthTimeline.tsx      # タイムライン表示
├── OcrUploader.tsx         # OCRアップローダー
├── HealthRecordForm.tsx    # 記録入力フォーム
├── ManualEntryForm.tsx     # 手動入力フォーム
├── MobileLayoutFix.tsx     # モバイルレイアウト調整
├── MobileSyncButton.tsx    # モバイル同期ボタン
└── habits/
    ├── HabitsPageClient.tsx
    ├── LifestyleTab.tsx
    └── SupplementsTab.tsx
```

---

## 8. 認証・認可

### 8.1 認証フロー
```
1. ユーザーが「Googleでログイン」をクリック
2. Google OAuth認証画面へリダイレクト
3. 認証成功後、コールバックでJWTセッション作成
4. セッションCookieをブラウザに保存
5. 以降のリクエストはセッションで認証
```

### 8.2 セッション管理
- **方式**: JWT (JSON Web Token)
- **保存先**: HTTP-only Cookie
- **有効期限**: 30日 (設定可能)

### 8.3 認可
- 全てのServer Actionで`getServerSession()`による認証チェック
- ユーザーIDによるデータフィルタリング (他ユーザーのデータにアクセス不可)
- Cascade Delete設定により、ユーザー削除時に関連データも削除

---

## 9. 外部連携

### 9.1 Fitbit連携

#### OAuth 2.0 (PKCE)フロー
```
1. クライアントでcode_verifier生成
2. code_challenge計算 (SHA-256)
3. Fitbit認証画面へリダイレクト
4. 認証後、codeを受け取り
5. code + code_verifierでトークン取得
6. FitbitAccountテーブルに保存
```

#### 同期データ
| データ種別 | 保存先 | 頻度 |
|-----------|--------|------|
| 心拍変動 (HRV) | HrvData | 日次 |
| 睡眠詳細 | DetailedSleep | 日次 |
| 分単位心拍 | IntradayHeartRate | 日次 |
| 活動量 | FitData | 日次 |
| 体重 | FitData | 日次 |
| 呼吸数 | FitData | 日次 |
| 皮膚温度 | FitData | 日次 |

#### 自動同期設定
| 条件 | 動作 |
|------|------|
| ページアクセス + 24時間以上経過 | 差分同期実行 |
| 初回接続 | 過去365日分フル同期 |
| 10日以上アクセスなし | Cronジョブで自動同期 |

### 9.2 Health Connect連携

#### 対応データ
- 歩数 (Steps)
- 距離 (Distance)
- 消費カロリー (ActiveCaloriesBurned)
- 心拍数 (HeartRateSeries)
- 体重 (Weight)
- 睡眠 (SleepSession)
- 血圧 (BloodPressure)
- 体温 (BodyTemperature)
- 酸素飽和度 (OxygenSaturation)

#### 同期期間
- デフォルト: 過去7日分
- Health Connect制限: 約30日分まで

### 9.3 Google Gemini連携

#### 用途
- 健康診断画像のOCR処理
- テキストからの構造化データ抽出

#### モデル
- gemini-2.5-pro

#### 出力形式
```json
{
  "date": "2026-01-04",
  "results": [
    {"item": "体重", "value": "65.5", "unit": "kg"},
    {"item": "血圧(上)", "value": "120", "unit": "mmHg"}
  ],
  "meta": {
    "hospitalName": "〇〇病院",
    "notes": "特記事項"
  }
}
```

---

## 10. セキュリティ

### 10.1 認証セキュリティ
- OAuth 2.0 + PKCE (Fitbit)
- セッションベース認証 (NextAuth)
- CSRF保護 (stateパラメータ)

### 10.2 データセキュリティ
- ユーザー単位のデータ分離
- Cascade Deleteによる完全削除
- トークンの暗号化保存

### 10.3 API セキュリティ
- 全APIでセッション認証必須
- Cron APIはBearerトークン認証
- 入力バリデーション

### 10.4 今後の改善点
- [ ] レート制限の実装
- [ ] 管理者認証の強化
- [ ] エクスポートデータの暗号化
- [ ] 監査ログの追加

---

## 11. 環境変数

### 11.1 必須環境変数
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Google Gemini
GOOGLE_API_KEY=your-api-key

# Fitbit
FITBIT_CLIENT_ID=your-fitbit-client-id
FITBIT_CLIENT_SECRET=your-fitbit-client-secret
FITBIT_REDIRECT_URI=https://your-domain.com/api/fitbit/callback

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 11.2 オプション環境変数
```env
# Cron認証
CRON_SECRET=your-cron-secret
```

---

## 12. デプロイメント

### 12.1 本番環境要件
- Node.js 18+
- PostgreSQL 14+
- Vercel (推奨) または Node.jsサーバー

### 12.2 Vercel設定

#### vercel.json
```json
{
  "crons": [
    {
      "path": "/api/cron/fitbit-sync",
      "schedule": "0 3 * * *"
    }
  ]
}
```

### 12.3 デプロイ手順
```bash
# 1. 依存関係インストール
npm install

# 2. Prismaクライアント生成
npx prisma generate

# 3. データベースマイグレーション
npx prisma migrate deploy

# 4. ビルド
npm run build

# 5. 起動
npm run start
```

### 12.4 Androidビルド
```bash
# Capacitor同期
npx cap sync android

# Android Studioで開く
npx cap open android

# APK/AABビルド
# Android Studio → Build → Generate Signed Bundle/APK
```

---

## 13. 開発ガイド

### 13.1 ローカル開発環境
```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# Prisma Studio (DB管理UI)
npx prisma studio
```

### 13.2 データベース操作
```bash
# マイグレーション作成
npx prisma migrate dev --name <migration-name>

# スキーマ反映 (開発用)
npx prisma db push

# クライアント再生成
npx prisma generate
```

### 13.3 コーディング規約
- TypeScript strict mode
- ESLint + Prettier
- Server Actionsは`'use server'`必須
- コンポーネントは関数コンポーネント

---

## 14. ファイル構成

```
/
├── prisma/
│   └── schema.prisma          # データベーススキーマ
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── page.tsx          # ダッシュボード
│   │   ├── layout.tsx        # ルートレイアウト
│   │   ├── actions/          # Server Actions (14ファイル)
│   │   ├── api/              # API Routes (11ルート)
│   │   ├── records/          # 健康記録ページ
│   │   ├── trends/           # トレンド分析ページ
│   │   ├── habits/           # 生活習慣ページ
│   │   ├── import/           # データ取り込みページ
│   │   ├── profile/          # プロフィールページ
│   │   └── settings/         # 設定ページ
│   ├── components/           # Reactコンポーネント (21+ファイル)
│   ├── lib/                  # ユーティリティ
│   │   ├── auth.ts          # NextAuth設定
│   │   ├── prisma.ts        # Prismaシングルトン
│   │   ├── fitbit/          # Fitbit連携 (6ファイル)
│   │   └── mobile-sync.ts   # Health Connect
│   ├── constants/           # 定数定義
│   └── types/               # 型定義
├── android/                  # Capacitor Android
├── docs/                     # ドキュメント
├── vercel.json              # Vercel設定
├── capacitor.config.ts      # Capacitor設定
└── package.json             # 依存関係
```

---

## 15. 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2026-01-04 | 1.0.0 | 初版作成 |

---

## 付録A: 検査項目マスタ (一部)

| コード | 標準名 | シノニム |
|--------|--------|---------|
| BMI | BMI | BMI, Body Mass Index |
| BP_SYS | 血圧(上) | 収縮期血圧, 最高血圧 |
| BP_DIA | 血圧(下) | 拡張期血圧, 最低血圧 |
| HBA1C | HbA1c | ヘモグロビンA1c, グリコヘモグロビン |
| TC | 総コレステロール | T-Cho, TC |
| HDL | HDLコレステロール | HDL-C, 善玉 |
| LDL | LDLコレステロール | LDL-C, 悪玉 |
| TG | 中性脂肪 | トリグリセリド, TG |
| AST | AST | GOT, AST(GOT) |
| ALT | ALT | GPT, ALT(GPT) |
| GGT | γ-GTP | ガンマGTP, γGTP |

---

## 付録B: 生活習慣カテゴリ

| カテゴリID | 表示名 | 項目例 |
|-----------|--------|--------|
| preferences | 嗜好品 | たばこ, お酒 |
| diet | 食生活 | 朝食, 間食 |
| sleep | 睡眠 | 睡眠時間, 睡眠の質 |
| exercise | 運動 | 運動頻度, 運動時間 |
| care | ケア | 通院, 服薬 |

---

*本仕様書は継続的に更新されます。最新版はdocs/SYSTEM_SPECIFICATION.mdを参照してください。*
