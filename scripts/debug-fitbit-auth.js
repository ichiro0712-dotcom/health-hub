/**
 * Fitbit OAuth Debug Script
 *
 * このスクリプトはBase64エンコードと資格情報を検証します。
 * 実行: node scripts/debug-fitbit-auth.js
 */

// ハードコードされた値（Vercel環境変数と同じ値を使用）
const clientId = '23TVQD';
const clientSecret = 'b28fe6710486a975bb3b0f8d7c868b30';

console.log('=== Fitbit OAuth Debug ===\n');

// 1. 文字数と文字コードを厳密にチェック（改行混入検出）
console.log('=== 1. Credential Validation ===');
console.log('Client ID:', clientId);
console.log('Client ID length:', clientId.length);
console.log('Client ID char codes:', [...clientId].map(c => c.charCodeAt(0)));

console.log('\nClient Secret:', clientSecret);
console.log('Client Secret length:', clientSecret.length);
console.log('Client Secret char codes:', [...clientSecret].map(c => c.charCodeAt(0)));

// 不可視文字チェック
const invisibleCharsId = [...clientId].filter(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) > 126);
const invisibleCharsSecret = [...clientSecret].filter(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) > 126);
console.log('\nInvisible chars in Client ID:', invisibleCharsId.length > 0 ? invisibleCharsId.map(c => c.charCodeAt(0)) : 'None');
console.log('Invisible chars in Client Secret:', invisibleCharsSecret.length > 0 ? invisibleCharsSecret.map(c => c.charCodeAt(0)) : 'None');

// 2. Base64 エンコード
console.log('\n=== 2. Base64 Encoding ===');
const credentials = `${clientId}:${clientSecret}`;
console.log('Credentials string:', credentials);
console.log('Credentials length:', credentials.length);

// Buffer.from を使用（現在のコードと同じ）
const basicAuthBuffer = Buffer.from(credentials).toString('base64');
console.log('\nBuffer.from() result:', basicAuthBuffer);
console.log('Buffer.from() length:', basicAuthBuffer.length);

// btoa を使用（代替方法）
const basicAuthBtoa = btoa(credentials);
console.log('\nbtoa() result:', basicAuthBtoa);
console.log('btoa() length:', basicAuthBtoa.length);

// 3. 期待値との比較
console.log('\n=== 3. Verification ===');
const expectedBase64 = 'MjNUVlFEOmIyOGZlNjcxMDQ4NmE5NzViYjNiMGY4ZDdjODY4YjMw';
console.log('Expected Base64:', expectedBase64);
console.log('Buffer.from() matches:', basicAuthBuffer === expectedBase64);
console.log('btoa() matches:', basicAuthBtoa === expectedBase64);

// デコードして確認
console.log('\n=== 4. Decode Verification ===');
const decodedBuffer = Buffer.from(basicAuthBuffer, 'base64').toString('utf8');
const decodedBtoa = atob(basicAuthBtoa);
console.log('Decoded from Buffer.from():', decodedBuffer);
console.log('Decoded from btoa():', decodedBtoa);
console.log('Decoded matches original:', decodedBuffer === credentials);

// 5. 実際のHTTPリクエストヘッダー形式
console.log('\n=== 5. Authorization Header ===');
console.log('Authorization: Basic ' + basicAuthBuffer);

// 6. 環境変数チェック（もし設定されていれば）
console.log('\n=== 6. Environment Variable Check ===');
const envClientId = process.env.FITBIT_CLIENT_ID;
const envClientSecret = process.env.FITBIT_CLIENT_SECRET;

if (envClientId) {
  console.log('ENV FITBIT_CLIENT_ID:', envClientId);
  console.log('ENV FITBIT_CLIENT_ID length:', envClientId.length);
  console.log('ENV FITBIT_CLIENT_ID char codes:', [...envClientId].map(c => c.charCodeAt(0)));
  console.log('ENV matches hardcoded:', envClientId === clientId);

  const envInvisible = [...envClientId].filter(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) > 126);
  if (envInvisible.length > 0) {
    console.log('⚠️  WARNING: Invisible characters detected in ENV FITBIT_CLIENT_ID!');
    console.log('Invisible char codes:', envInvisible.map(c => c.charCodeAt(0)));
  }
} else {
  console.log('FITBIT_CLIENT_ID not set in environment');
}

if (envClientSecret) {
  console.log('\nENV FITBIT_CLIENT_SECRET length:', envClientSecret.length);
  console.log('ENV matches hardcoded:', envClientSecret === clientSecret);

  const envInvisible = [...envClientSecret].filter(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) > 126);
  if (envInvisible.length > 0) {
    console.log('⚠️  WARNING: Invisible characters detected in ENV FITBIT_CLIENT_SECRET!');
    console.log('Invisible char codes:', envInvisible.map(c => c.charCodeAt(0)));
  }
} else {
  console.log('FITBIT_CLIENT_SECRET not set in environment');
}

console.log('\n=== Debug Complete ===');
console.log('\nNext step: Use curl to test directly against Fitbit API');
console.log('curl -X POST https://api.fitbit.com/oauth2/token \\');
console.log('  -u "23TVQD:b28fe6710486a975bb3b0f8d7c868b30" \\');
console.log('  -H "Content-Type: application/x-www-form-urlencoded" \\');
console.log('  -d "grant_type=authorization_code" \\');
console.log('  -d "code=YOUR_AUTH_CODE" \\');
console.log('  -d "code_verifier=YOUR_CODE_VERIFIER" \\');
console.log('  -d "redirect_uri=https://health-hub-eight.vercel.app/api/fitbit/callback"');
