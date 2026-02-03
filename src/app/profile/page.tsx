'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from '../actions/user';
import { redirect } from 'next/navigation';
import ProfileForm from './ProfileForm';

import Link from 'next/link';
import { Merge, Smartphone, FileText, LogOut } from 'lucide-react';

import Header from '@/components/Header';

export default async function ProfilePage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/');

    const { data: profile } = await getUserProfile();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20">
            <Header />
            <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-8">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">プロフィール設定</h1>
                    <ProfileForm initialData={profile} />
                </div>

                {/* Additional Settings Links */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-slate-700">
                        <h2 className="font-bold text-gray-800 dark:text-gray-200">アプリ設定</h2>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-slate-700">
                        <a href="/profile/settings/items" className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#E0F7FA] dark:bg-teal-900/30 flex items-center justify-center text-[#006064] dark:text-teal-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-gray-900 dark:text-gray-100">検査項目・基準値設定</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">グラフ表示の基準値や検索タグを設定します</div>
                                </div>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="m9 18 6-6-6-6" /></svg>
                        </a>

                        {/* Merge Items Link */}
                        <Link href="/profile/settings/items/merge" className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                    <Merge className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-gray-900 dark:text-gray-100">検査項目の統合</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">重複した検査項目を名寄せ・統合します</div>
                                </div>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="m9 18 6-6-6-6" /></svg>
                        </Link>

                        {/* Smartphone Data Sync Settings */}
                        <Link href="/smartphone" className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <Smartphone className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-gray-900 dark:text-gray-100">スマホデータ連携</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Health Connect・Fitbitと同期</div>
                                </div>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="m9 18 6-6-6-6" /></svg>
                        </Link>

                        {/* Google Docs Sync Settings */}
                        <Link href="/settings/google-docs" className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-gray-900 dark:text-gray-100">Google Docs連携</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">データの自動同期設定</div>
                                </div>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="m9 18 6-6-6-6" /></svg>
                        </Link>
                    </div>
                </div>

                {/* Logout Section */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <Link href="/api/auth/signout" className="flex items-center justify-between p-4 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                                <LogOut className="w-4 h-4" />
                            </div>
                            <div className="font-bold text-sm text-red-600 dark:text-red-400">ログアウト</div>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><path d="m9 18 6-6-6-6" /></svg>
                    </Link>
                </div>
            </div>
        </div >
    );
}
