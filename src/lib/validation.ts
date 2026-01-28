/**
 * 共通バリデーション関数
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ERROR_MESSAGES } from "./constants";

/**
 * 認証済みユーザーを取得
 * セッションのuser.idを使用してユーザーを検索（emailではなくidで検索することでセキュリティ向上）
 * @returns ユーザーオブジェクトまたはエラーレスポンス
 */
export async function getAuthenticatedUser() {
    const session = await getServerSession(authOptions);

    // セッションにidが含まれているかを優先的にチェック
    if (!session?.user?.id) {
        return {
            success: false as const,
            error: ERROR_MESSAGES.UNAUTHORIZED,
            user: null,
        };
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
    });

    if (!user) {
        return {
            success: false as const,
            error: ERROR_MESSAGES.USER_NOT_FOUND,
            user: null,
        };
    }

    return {
        success: true as const,
        error: null,
        user,
    };
}

/**
 * 認証済みユーザーIDを取得（軽量版）
 * セッションから直接IDを取得するため、DBクエリ不要
 * @returns ユーザーIDまたはnull
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
    const session = await getServerSession(authOptions);

    // セッションから直接IDを返す（DBクエリ不要）
    return session?.user?.id || null;
}

/**
 * 管理者かどうかを確認
 * @param email ユーザーのメールアドレス
 * @returns 管理者ならtrue
 */
export function isAdmin(email: string | null | undefined): boolean {
    if (!email) return false;

    const adminEmails = (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(e => e.length > 0);

    return adminEmails.includes(email.toLowerCase());
}

/**
 * 文字列をサニタイズ（XSS対策）
 * @param input 入力文字列
 * @returns サニタイズされた文字列
 */
export function sanitizeString(input: string): string {
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * 文字列の長さを検証
 * @param input 入力文字列
 * @param maxLength 最大長
 * @returns 有効ならtrue
 */
export function validateStringLength(input: string | null | undefined, maxLength: number): boolean {
    if (!input) return true;
    return input.length <= maxLength;
}

/**
 * 日付文字列を検証
 * @param dateString 日付文字列（YYYY-MM-DD形式）
 * @returns 有効ならtrue
 */
export function isValidDateString(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;

    const date = new Date(dateString);
    return !isNaN(date.getTime());
}

/**
 * メールアドレスを検証
 * @param email メールアドレス
 * @returns 有効ならtrue
 */
export function isValidEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * URLを検証
 * @param url URL文字列
 * @returns 有効ならtrue
 */
export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}
