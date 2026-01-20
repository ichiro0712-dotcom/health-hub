'use client';

import { signIn } from "next-auth/react";

export default function LoginButton() {
    return (
        <div className="flex gap-2">
            <button
                onClick={() => signIn("google")}
                className="px-6 py-2.5 bg-[#00CED1] text-white font-medium rounded-lg hover:bg-[#00acc1] transition shadow-sm"
            >
                Googleでログイン
            </button>
            {/* Test Login Button (Only visible if dev environment conceptually, assuming component logic handles or just always show for this MVP) */}
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
