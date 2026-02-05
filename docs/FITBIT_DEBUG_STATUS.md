# Fitbit OAuth デバッグ状況まとめ

## 現在の状況
OAuth 認証フローでトークン交換時に `invalid_client` エラーが発生し続けている

## エラーメッセージ
```
Token refresh failed: {
  success: false,
  errors: [{
    errorType: 'invalid_client',
    message: 'Invalid authorization header. Client id invalid.'
  }]
}
```

---

## 環境情報

| 項目 | 値 |
|------|-----|
| 本番URL | `https://health-hub-eight.vercel.app` |
| Fitbit Client ID | `23TVQD`（6文字） |
| Fitbit Client Secret | `b28fe6710486a975bb3b0f8d7c868b30`（32文字）※リセット後 |
| Redirect URL | `https://health-hub-eight.vercel.app/api/fitbit/callback` |
| Application Type | Server（Personal から変更済み） |

---

## 試したこと一覧

### 1. Redirect URL の修正 ❌
- 古い: `health-hub-rho.vercel.app`
- 新しい: `health-hub-eight.vercel.app`
- Fitbit Developer Console と Vercel 両方で修正
- **結果**: 同じエラー

### 2. Client Secret のリセット ❌
- Fitbit Developer Console で「Reset Client Secret」を実行
- 新しい Secret: `b28fe6710486a975bb3b0f8d7c868b30`
- Vercel 環境変数を `vercel env rm` → `vercel env add` で再設定
- 再デプロイ実施
- **結果**: 同じエラー

### 3. Application Type を Server に変更 ❌
- Personal → Server に変更
- **結果**: 同じエラー

### 4. 認証方式の変更（Body パラメータ方式）❌
- Basic Auth ヘッダーを削除
- `client_id` と `client_secret` を Body に含める方式に変更
```typescript
const params = new URLSearchParams({
  client_id: config.clientId,
  client_secret: config.clientSecret,
  grant_type: 'authorization_code',
  code,
  code_verifier: codeVerifier,
  redirect_uri: config.redirectUri,
});
// Authorization ヘッダーなし
```
- **結果**: 同じエラー

### 5. 認証方式を Basic Auth に戻す ❌
- Body から `client_id`/`client_secret` を削除
- `Authorization: Basic {base64(client_id:client_secret)}` ヘッダーを使用
```typescript
const params = new URLSearchParams({
  grant_type: 'authorization_code',
  code,
  code_verifier: codeVerifier,
  redirect_uri: config.redirectUri,
});
const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
// Authorization: Basic {basicAuth} ヘッダーあり
```
- **結果**: 同じエラー

### 6. DB レコードの削除 ❌
- FitbitAccount の pending レコードを削除してクリーンな状態に
- **結果**: 同じエラー

---

## 次に試すべきこと（優先順位順）

### ★★★ 最優先: ローカル検証で原因切り分け

#### Step 1: curl コマンドで直接 Fitbit API を叩く
```bash
# 1. まず認証URLにアクセスして code を取得
# ブラウザで以下にアクセス（code_verifier と code_challenge は事前に生成）

# 2. 取得した code で curl テスト
curl -X POST https://api.fitbit.com/oauth2/token \
  -u "23TVQD:b28fe6710486a975bb3b0f8d7c868b30" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_AUTH_CODE" \
  -d "code_verifier=YOUR_CODE_VERIFIER" \
  -d "redirect_uri=https://health-hub-eight.vercel.app/api/fitbit/callback"
```

**curl の `-u` オプションを使うことで、Base64 エンコードを curl に任せられる**
→ これで成功すれば、コードの実装問題が確定

#### Step 2: スタンドアローン Node.js スクリプトで検証
`scripts/debug-fitbit-auth.js` を作成して実行：

```javascript
// scripts/debug-fitbit-auth.js
const clientId = '23TVQD';
const clientSecret = 'b28fe6710486a975bb3b0f8d7c868b30';

// 文字数と文字コードを厳密にチェック（改行混入検出）
console.log('=== Credential Validation ===');
console.log('Client ID length:', clientId.length);
console.log('Client Secret length:', clientSecret.length);
console.log('Client ID char codes:', [...clientId].map(c => c.charCodeAt(0)));
console.log('Client Secret char codes:', [...clientSecret].map(c => c.charCodeAt(0)));

// Base64 エンコード
const credentials = `${clientId}:${clientSecret}`;
const basicAuth = Buffer.from(credentials).toString('base64');

console.log('\n=== Basic Auth Header ===');
console.log('Credentials string:', credentials);
console.log('Credentials length:', credentials.length);
console.log('Base64 result:', basicAuth);
console.log('Base64 length:', basicAuth.length);
console.log('Authorization header:', `Basic ${basicAuth}`);

// 期待値との比較
// 23TVQD:b28fe6710486a975bb3b0f8d7c868b30 → MjNUVlFEOmIyOGZlNjcxMDQ4NmE5NzViYjNiMGY4ZDdjODY4YjMw
const expectedBase64 = Buffer.from('23TVQD:b28fe6710486a975bb3b0f8d7c868b30').toString('base64');
console.log('\n=== Verification ===');
console.log('Expected Base64:', expectedBase64);
console.log('Match:', basicAuth === expectedBase64);
```

実行方法:
```bash
node scripts/debug-fitbit-auth.js
```

### ★★ 重要: 環境変数の見えない改行問題

Vercel 環境変数に **改行コード `\n` が混入している可能性が高い**

確認方法:
```bash
# ローカルに環境変数をダウンロード
cd /Users/kawashimaichirou/Desktop/バイブコーディング/health-hub
vercel env pull .env.local

# ファイルの内容を16進数で確認（改行検出）
xxd .env.local | grep -A2 FITBIT_CLIENT
```

修正方法:
1. Vercel ダッシュボードで環境変数を**一度削除**
2. **手打ちで**再入力（コピペしない）
3. または、trim() してから使う実装に変更

### ★ Buffer の代わりに btoa を使う

Edge Runtime では `Buffer` が期待通りに動かないことがある

```typescript
// 現在のコード
const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

// 修正案: btoa を使う
const basicAuth = btoa(`${config.clientId}:${config.clientSecret}`);
```

### その他の可能性

1. **PKCE なしで試す**
   - Server タイプでは `code_verifier` が不要/禁止の可能性
   - 認証 URL から `code_challenge` パラメータを削除してテスト

2. **新しい Fitbit アプリを作成**
   - 現在のアプリがブロックされている可能性
   - 完全にクリーンな状態でテスト

3. **Vercel のランタイムログ確認**
   - デバッグログ（credential lengths など）が実際に出力されているか確認
   - Vercel ダッシュボード → Functions → Logs

---

## 現在のコード（oauth.ts）

```typescript
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  config: FitbitOAuthConfig
): Promise<FitbitTokenResponse> {
  console.log('Token exchange - Credential check:', {
    clientIdLength: config.clientId?.length,
    clientSecretLength: config.clientSecret?.length,
    redirectUri: config.redirectUri,
    codeLength: code?.length,
    codeVerifierLength: codeVerifier?.length,
  });

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    code_verifier: codeVerifier,
    redirect_uri: config.redirectUri,
  });

  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  console.log('Basic Auth created, length:', basicAuth.length);

  const response = await fetch(FITBIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
    },
    body: params.toString(),
  });

  // ... error handling
}
```

---

## 関連ファイル

- `src/lib/fitbit/oauth.ts` - OAuth 関連関数
- `src/lib/fitbit/client.ts` - Fitbit API クライアント
- `src/lib/fitbit/sync.ts` - データ同期サービス
- `src/app/api/fitbit/auth/route.ts` - 認証開始エンドポイント
- `src/app/api/fitbit/callback/route.ts` - コールバック処理

---

## 再開時の手順

1. このドキュメントを読む
2. まず `scripts/debug-fitbit-auth.js` を作成して実行し、Base64 エンコード結果を確認
3. curl コマンドで直接 Fitbit API をテスト
4. 成功/失敗に応じて原因を特定し、修正を適用
