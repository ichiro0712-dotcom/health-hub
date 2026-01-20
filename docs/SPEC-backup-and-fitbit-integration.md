# 仕様書: データベースバックアップ・復元 & Fitbit Web API 統合

## 概要

本ドキュメントは、Health Hubアプリに対する以下2つの大規模改修の仕様と実装計画を定義します：

1. **ステップ1**: データベースのバックアップと復元機能の実装
2. **ステップ2**: Fitbit Web API導入によるハイブリッドデータソース構成

---

## 現状分析

### 技術スタック
| 項目 | 技術 |
|------|------|
| フロントエンド | Next.js 16.1.1 + React 19.2.3 + TypeScript |
| モバイル | Capacitor 8.0.0 (ハイブリッドAndroidアプリ) |
| データベース | PostgreSQL + Prisma ORM 5.22.0 |
| 認証 | NextAuth 4.24.13 (Google OAuth) |
| Health Connect | capacitor-health-connect v0.7.0 |

### 現在のデータベーススキーマ (11テーブル)

```
User              - ユーザー情報
Account           - OAuth認証情報
Session           - セッション管理
FitData           - 健康データ (Health Connectから同期)
HealthRecord      - 健康診断記録 (OCR抽出)
UserHealthItemSetting - 個人設定
LifestyleHabit    - 生活習慣
Supplement        - サプリメント記録
InspectionItem    - 検査項目
InspectionItemAlias - 項目名エイリアス
InspectionItemHistory - 項目履歴
MasterItem        - マスターデータ (JLAC10)
```

### 現在のHealth Connect取得データ
- Steps (歩数)
- Distance (距離)
- Active Calories Burned (消費カロリー)
- Heart Rate Series (心拍数)
- Weight (体重)
- Sleep Session (睡眠時間)
- Blood Pressure (血圧)
- Body Temperature (体温)
- Oxygen Saturation (血中酸素濃度)

---

## ステップ1: データベースバックアップ・復元機能

### 1.1 目的
- 大規模改修前にデータを安全に保護
- 任意の時点への復元が可能な状態を確保
- 開発者・ユーザー双方がバックアップを実行可能に

### 1.2 機能要件

#### 1.2.1 エクスポート機能
| 要件ID | 説明 |
|--------|------|
| EXP-01 | 全テーブルのデータをJSON形式でエクスポート |
| EXP-02 | テーブル単位での選択的エクスポート |
| EXP-03 | ユーザー単位でのエクスポート (マルチテナント対応) |
| EXP-04 | タイムスタンプ付きファイル名で保存 |
| EXP-05 | 圧縮オプション (gzip) |

#### 1.2.2 インポート機能
| 要件ID | 説明 |
|--------|------|
| IMP-01 | JSONファイルからのデータ復元 |
| IMP-02 | 既存データの処理オプション: 上書き / スキップ / マージ |
| IMP-03 | トランザクション処理 (失敗時ロールバック) |
| IMP-04 | 外部キー制約を考慮した依存順序での復元 |
| IMP-05 | インポート前のバリデーション |

#### 1.2.3 開発者UI
| 要件ID | 説明 |
|--------|------|
| UI-01 | バックアップ実行ボタン |
| UI-02 | 復元実行ボタン (ファイル選択) |
| UI-03 | バックアップ履歴一覧 |
| UI-04 | 進捗表示 |
| UI-05 | 環境制限 (開発環境のみ or 管理者のみ) |

### 1.3 技術設計

#### 1.3.1 エクスポートフォーマット
```json
{
  "metadata": {
    "version": "1.0.0",
    "exportedAt": "2026-01-04T12:00:00Z",
    "appVersion": "1.0.0",
    "tables": ["User", "FitData", "..."]
  },
  "data": {
    "User": [...],
    "Account": [...],
    "FitData": [...],
    "HealthRecord": [...],
    "UserHealthItemSetting": [...],
    "LifestyleHabit": [...],
    "Supplement": [...],
    "InspectionItem": [...],
    "InspectionItemAlias": [...],
    "InspectionItemHistory": [...],
    "MasterItem": [...]
  }
}
```

#### 1.3.2 依存順序 (インポート時)
```
1. MasterItem          (依存なし)
2. User                (依存なし)
3. Account             (→ User)
4. Session             (→ User)
5. FitData             (→ User)
6. HealthRecord        (→ User)
7. UserHealthItemSetting (→ User)
8. LifestyleHabit      (→ User)
9. Supplement          (→ User)
10. InspectionItem     (→ User, → MasterItem)
11. InspectionItemAlias (→ InspectionItem)
12. InspectionItemHistory (→ InspectionItem)
```

#### 1.3.3 API設計
```
POST /api/admin/backup/export
  - Query: tables (optional, comma-separated)
  - Query: userId (optional, for user-specific export)
  - Response: JSON file download

POST /api/admin/backup/import
  - Body: FormData with backup file
  - Query: mode (overwrite | skip | merge)
  - Response: { success, imported, skipped, errors }

GET /api/admin/backup/history
  - Response: List of backup metadata
```

### 1.4 ファイル構成
```
src/
├── app/
│   ├── api/
│   │   └── admin/
│   │       └── backup/
│   │           ├── export/route.ts
│   │           ├── import/route.ts
│   │           └── history/route.ts
│   └── debug/
│       └── backup/
│           └── page.tsx        # 開発者UI
├── lib/
│   └── backup/
│       ├── exporter.ts         # エクスポートロジック
│       ├── importer.ts         # インポートロジック
│       ├── validator.ts        # バリデーション
│       └── types.ts            # 型定義
```

---

## ステップ2: Fitbit Web API 統合

### 2.1 目的
- Health Connectでは取得困難な詳細データの取得
- HRV、詳細睡眠ステージ、秒単位心拍数の追加
- Fitbitデバイスからの高精度データ活用

### 2.2 アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────┐
│                    Health Hub App                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐     ┌─────────────────────────────┐   │
│  │ Health Connect  │     │     Fitbit Web API          │   │
│  │    (既存)       │     │        (新規)               │   │
│  │                 │     │                             │   │
│  │ - 歩数          │     │ - 歩数 (イントラデイ)       │   │
│  │ - 心拍数 (平均) │     │ - 心拍数 (秒単位)          │   │
│  │ - 睡眠時間      │     │ - 睡眠ステージ詳細         │   │
│  │ - 体重計データ  │     │ - HRV (心拍変動)           │   │
│  │ - 血圧          │     │ - SpO2 詳細                │   │
│  │ - 体温          │     │ - 呼吸数                   │   │
│  │ - SpO2          │     │                             │   │
│  └────────┬────────┘     └──────────────┬──────────────┘   │
│           │                              │                  │
│           └──────────────┬───────────────┘                  │
│                          ▼                                  │
│              ┌─────────────────────┐                       │
│              │   Data Integrator   │                       │
│              │  (重複排除 & 統合)   │                       │
│              └──────────┬──────────┘                       │
│                         ▼                                  │
│              ┌─────────────────────┐                       │
│              │   PostgreSQL DB     │                       │
│              │   (Prisma ORM)      │                       │
│              └─────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 データソース優先順位

| データ種別 | 優先ソース | 補完ソース | 理由 |
|-----------|-----------|-----------|------|
| 歩数 | Fitbit API (イントラデイ) | Health Connect | Fitbitの方が詳細 |
| 心拍数 | Fitbit API (秒単位) | Health Connect | Fitbitの方が詳細 |
| 睡眠 | Fitbit API (ステージ詳細) | Health Connect | ステージ情報が豊富 |
| HRV | Fitbit API | - | Health Connectでは取得困難 |
| 体重 | Health Connect | Fitbit API | 他社体重計データを優先 |
| 血圧 | Health Connect | - | Fitbit非対応 |
| 体温 | Health Connect | - | Fitbit非対応 |
| SpO2 | Fitbit API (詳細) | Health Connect | Fitbitの方が詳細 |

### 2.4 新規追加データ

#### 2.4.1 HRV (心拍変動)
```typescript
interface HrvData {
  date: Date;
  dailyRmssd: number;      // RMSSD値 (ms)
  deepRmssd: number;       // 深い睡眠時のRMSSD
  hrvContributions: {      // HRVに影響する要因
    breathing: number;
    stress: number;
    recovery: number;
  };
}
```

#### 2.4.2 詳細睡眠ステージ
```typescript
interface SleepStage {
  dateTime: string;        // ISO8601
  level: 'wake' | 'light' | 'deep' | 'rem';
  seconds: number;
}

interface DetailedSleep {
  date: Date;
  duration: number;        // 総分数
  efficiency: number;      // 睡眠効率 (%)
  stages: {
    wake: number;          // 覚醒時間 (分)
    light: number;         // 浅い睡眠 (分)
    deep: number;          // 深い睡眠 (分)
    rem: number;           // REM睡眠 (分)
  };
  stageDetails: SleepStage[];  // 30秒間隔の詳細
}
```

#### 2.4.3 秒単位心拍数
```typescript
interface IntradayHeartRate {
  date: Date;
  restingHeartRate: number;
  zones: {
    outOfRange: number;    // 分
    fatBurn: number;       // 分
    cardio: number;        // 分
    peak: number;          // 分
  };
  intradayData: {
    time: string;          // HH:mm:ss
    value: number;         // BPM
  }[];
}
```

### 2.5 データベーススキーマ拡張

```prisma
// 新規テーブル: Fitbitアカウント連携
model FitbitAccount {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  fitbitUserId  String
  accessToken   String   @db.Text
  refreshToken  String   @db.Text
  expiresAt     DateTime
  scope         String   // 許可されたスコープ
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// 新規テーブル: HRVデータ
model HrvData {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date            DateTime @db.Date
  dailyRmssd      Float    // 日次RMSSD値
  deepRmssd       Float?   // 深い睡眠時RMSSD
  coverage        Float?   // データカバレッジ (%)
  lowFrequency    Float?   // 低周波成分
  highFrequency   Float?   // 高周波成分
  raw             Json?    // 生データ
  syncedAt        DateTime @default(now())

  @@unique([userId, date])
}

// 新規テーブル: 詳細睡眠データ
model DetailedSleep {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date            DateTime @db.Date
  logId           String   // Fitbit睡眠ログID
  startTime       DateTime
  endTime         DateTime
  duration        Int      // 総分数
  efficiency      Int      // 睡眠効率 (%)
  minutesAwake    Int
  minutesLight    Int
  minutesDeep     Int
  minutesRem      Int
  stages          Json     // 詳細ステージデータ
  raw             Json?    // 生データ
  syncedAt        DateTime @default(now())

  @@unique([userId, logId])
  @@index([userId, date])
}

// 新規テーブル: イントラデイ心拍数
model IntradayHeartRate {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date              DateTime @db.Date
  restingHeartRate  Int?
  outOfRangeMinutes Int?
  fatBurnMinutes    Int?
  cardioMinutes     Int?
  peakMinutes       Int?
  intradayData      Json     // 秒/分単位の心拍データ
  raw               Json?
  syncedAt          DateTime @default(now())

  @@unique([userId, date])
}

// FitDataテーブルの拡張
model FitData {
  // 既存フィールド...

  // 新規追加
  source            String?  // 'health_connect' | 'fitbit' | 'merged'
  fitbitSyncId      String?  // Fitbit同期ID (重複排除用)
  respiratoryRate   Float?   // 呼吸数
  skinTemperature   Float?   // 皮膚温度変動
}
```

### 2.6 Fitbit OAuth 2.0 PKCE 実装

#### 2.6.1 認証フロー
```
1. ユーザーが「Fitbit連携」ボタンをクリック
2. PKCE用 code_verifier と code_challenge 生成
3. Fitbit認証URL生成 & リダイレクト
4. ユーザーがFitbitで認可
5. コールバックでauthorization_code受信
6. code_verifierを使用してトークン交換
7. アクセストークン・リフレッシュトークンをDB保存
8. 定期的なトークンリフレッシュ
```

#### 2.6.2 必要なスコープ
```
activity        - 歩数、カロリー、距離
heartrate       - 心拍数 (イントラデイ含む)
sleep           - 睡眠データ
oxygen_saturation - SpO2
respiratory_rate  - 呼吸数
temperature     - 皮膚温度
```

### 2.7 API設計

#### 2.7.1 認証API
```
GET /api/fitbit/auth
  - PKCEチャレンジ生成
  - Fitbit認証URLへリダイレクト

GET /api/fitbit/callback
  - authorization_code受信
  - トークン交換
  - DB保存

POST /api/fitbit/refresh
  - アクセストークンリフレッシュ

DELETE /api/fitbit/disconnect
  - Fitbit連携解除
```

#### 2.7.2 データ同期API
```
POST /api/fitbit/sync
  - Query: dataTypes (optional)
  - Query: startDate, endDate
  - 全データタイプの同期実行

GET /api/fitbit/status
  - 連携状態確認
  - 最終同期日時
```

### 2.8 データ統合ロジック

#### 2.8.1 重複排除アルゴリズム
```typescript
async function integrateData(
  healthConnectData: FitData[],
  fitbitData: FitbitSyncResult
): Promise<IntegratedData[]> {
  // 1. 日付でグループ化
  const byDate = groupByDate([...healthConnectData, ...fitbitData]);

  // 2. 各日付で統合
  return byDate.map(dateGroup => {
    const hc = dateGroup.healthConnect;
    const fb = dateGroup.fitbit;

    return {
      date: dateGroup.date,
      // Fitbit優先データ
      steps: fb?.steps ?? hc?.steps,
      heartRate: fb?.heartRate ?? hc?.heartRate,
      sleep: fb?.detailedSleep ?? hc?.sleep,
      // Health Connect優先データ
      weight: hc?.weight ?? fb?.weight,
      bloodPressure: hc?.bloodPressure,
      // Fitbit専用データ
      hrv: fb?.hrv,
      sleepStages: fb?.sleepStages,
      intradayHr: fb?.intradayHeartRate,
      // ソース情報
      source: determineSource(hc, fb)
    };
  });
}
```

### 2.9 ファイル構成

```
src/
├── app/
│   ├── api/
│   │   └── fitbit/
│   │       ├── auth/route.ts
│   │       ├── callback/route.ts
│   │       ├── refresh/route.ts
│   │       ├── disconnect/route.ts
│   │       ├── sync/route.ts
│   │       └── status/route.ts
│   └── settings/
│       └── fitbit/
│           └── page.tsx          # Fitbit連携UI
├── lib/
│   └── fitbit/
│       ├── client.ts             # Fitbit APIクライアント
│       ├── oauth.ts              # OAuth PKCE実装
│       ├── sync.ts               # データ同期ロジック
│       ├── types.ts              # 型定義
│       └── integrator.ts         # データ統合
├── components/
│   └── fitbit/
│       ├── ConnectButton.tsx
│       ├── SyncStatus.tsx
│       └── DataPreview.tsx
```

---

## 実装計画

### フェーズ1: バックアップ機能 (推定: 中規模)
1. [ ] エクスポートAPIの実装
2. [ ] インポートAPIの実装
3. [ ] バリデーションロジック
4. [ ] 開発者UIの作成
5. [ ] テスト

### フェーズ2: Fitbit認証基盤 (推定: 中規模)
1. [ ] Prismaスキーマ拡張
2. [ ] OAuth PKCE実装
3. [ ] 認証コールバック処理
4. [ ] トークン管理

### フェーズ3: Fitbitデータ取得 (推定: 大規模)
1. [ ] Fitbit APIクライアント
2. [ ] 各データタイプの取得実装
3. [ ] データ正規化

### フェーズ4: データ統合 (推定: 大規模)
1. [ ] 統合ロジック実装
2. [ ] 重複排除
3. [ ] ダッシュボード更新
4. [ ] トレンド画面対応

### フェーズ5: UI & 仕上げ (推定: 中規模)
1. [ ] Fitbit連携設定画面
2. [ ] 同期ステータス表示
3. [ ] エラーハンドリング強化
4. [ ] ドキュメント整備

---

## リスクと対策

| リスク | 影響度 | 対策 |
|-------|-------|------|
| Fitbit API制限 (150req/hour) | 中 | バッチ処理、キャッシュ活用 |
| トークン失効 | 中 | 自動リフレッシュ、通知機能 |
| データ不整合 | 高 | トランザクション、ロールバック |
| Health Connect障害 | 低 | Fitbitのみでの動作継続 |
| スキーマ変更による既存データ影響 | 高 | マイグレーション + バックアップ |

---

## 成功基準

1. **バックアップ機能**
   - 全テーブルのエクスポート・インポートが正常動作
   - 復元後のデータ整合性100%

2. **Fitbit統合**
   - OAuth認証の成功率 > 99%
   - HRV、睡眠ステージ、イントラデイ心拍の取得
   - 重複なしのデータ統合

3. **パフォーマンス**
   - 同期処理 < 30秒 (7日分)
   - バックアップ処理 < 60秒 (1000レコード)

---

## 参考資料

- [Fitbit Web API Documentation](https://dev.fitbit.com/build/reference/web-api/)
- [OAuth 2.0 PKCE](https://dev.fitbit.com/build/reference/web-api/authorization/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Health Connect API](https://developer.android.com/health-and-fitness/guides/health-connect)
