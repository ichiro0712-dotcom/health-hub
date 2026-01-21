'use client';

import { signIn } from "next-auth/react";

export default function LoginButton() {
    return (
        <div className="flex flex-col gap-3">
            <button
                onClick={() => signIn("google")}
                className="px-6 py-2.5 bg-[#00CED1] text-white font-medium rounded-lg hover:bg-[#00acc1] transition shadow-sm"
            >
                Googleログイン
            </button>
            <button
                onClick={() => signIn("google", { callbackUrl: "/" }, { prompt: "select_account" })}
                className="px-6 py-2.5 bg-white text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition shadow-sm border border-slate-200"
            >
                新規登録
            </button>
            {process.env.NODE_ENV !== 'production' && (
                <button
                    onClick={() => signIn("credentials", { callbackUrl: "/" })}
                    className="px-6 py-2.5 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-900 transition shadow-sm"
                >
                    テストログイン
                </button>
            )}
        </div>
    );
}
