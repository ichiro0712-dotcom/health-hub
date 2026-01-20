'use client';

import { useState } from 'react';
import { updateUserProfile } from '../actions/user';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function ProfileForm({ initialData }: { initialData: any }) {
    const router = useRouter();
    const [name, setName] = useState(initialData?.name || '');
    const [birthDate, setBirthDate] = useState(initialData?.birthDate ? new Date(initialData.birthDate).toISOString().split('T')[0] : '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await updateUserProfile({ name, birthDate });
        if (res.success) {
            toast.success("プロフィールを更新しました");
            router.refresh();
            router.push('/');
        } else {
            toast.error(res.error || "更新に失敗しました");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">お名前</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-[#00CED1] outline-none"
                    placeholder="お名前"
                />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">生年月日</label>
                <p className="text-xs text-gray-500 mb-2">年齢を自動計算するために使用します。</p>
                <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-[#00CED1] outline-none"
                    placeholder="YYYY-MM-DD"
                />
            </div>
            <button
                type="submit"
                className="w-full bg-[#00CED1] text-white font-bold py-3 rounded-lg hover:bg-[#00acc1] transition"
            >
                保存する
            </button>
        </form>
    );
}
