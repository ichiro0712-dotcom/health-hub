import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * 管理者メールアドレスのチェック
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

/**
 * 管理者認証チェック。失敗時は NextResponse を返す。
 * 成功時は session を返す。
 */
export async function requireAdmin(): Promise<
  | { ok: true; session: { user: { id: string; name: string; email: string; image: string } } }
  | { ok: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return {
      ok: false,
      response: NextResponse.json({ error: '認証が必要です' }, { status: 401 }),
    };
  }

  if (!isAdminEmail(session.user.email)) {
    return {
      ok: false,
      response: NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 }),
    };
  }

  return { ok: true, session: session as any };
}
