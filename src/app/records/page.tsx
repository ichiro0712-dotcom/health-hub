import { getRecords } from '../actions/records';
import { getHabitsForExport } from '../actions/habits';
import Link from 'next/link';
import { Calendar, FileText, ArrowRight, Activity, Plus } from 'lucide-react';
import Header from '@/components/Header';
import ExportDataButton from '@/components/ExportDataButton';
import { format } from 'date-fns';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function RecordsPage() {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect("/");
    }

    const { success, data: records } = await getRecords();
    const habitsResult = await getHabitsForExport();
    const habits = habitsResult.success ? habitsResult.data || [] : [];

    if (!success || !records) {
        return (
            <div className="min-h-screen pb-24 md:pb-8">
                <Header />
                <div className="p-8 text-center text-red-500">記録の取得に失敗しました</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-24 md:pb-8">
            <Header />

            <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <FileText className="w-6 h-6 text-teal-500" />
                            診断記録
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">健康診断や検査結果の履歴を管理します</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <ExportDataButton
                            records={records.map(r => ({
                                id: r.id,
                                date: r.date,
                                title: r.title,
                                summary: r.summary,
                                data: r.data,
                                additional_data: r.additional_data
                            }))}
                            habits={habits.map(h => ({
                                ...h,
                                type: h.type as 'yes_no' | 'numeric'
                            }))}
                            showRecords={true}
                            showHabits={true}
                        />
                        <Link
                            href="/import"
                            className="hidden md:flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition shadow-sm font-medium"
                        >
                            <Plus className="w-4 h-4" /> 新規登録
                        </Link>
                    </div>
                </div>

                {records.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 mb-1">記録はまだありません</h3>
                        <p className="text-slate-500 text-sm mb-6">健康診断書をアップロードして分析を始めましょう</p>
                        <Link
                            href="/import"
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-500 text-white rounded-full hover:bg-teal-600 transition shadow-md font-bold"
                        >
                            <Plus className="w-4 h-4" /> 新しい診断書をアップロード
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {records.map((record) => {
                            const meta = record.additional_data as any || {};
                            // Use normalized results array if available
                            const itemsCount = (record.data as any)?.results?.length || (Array.isArray(record.data) ? record.data.length : 0);

                            return (
                                <Link
                                    key={record.id}
                                    href={`/records/${record.id}`}
                                    className="block bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-teal-100 transition group"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-teal-50 rounded-xl text-teal-600 group-hover:scale-110 transition-transform shrink-0">
                                            <Activity className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-lg whitespace-nowrap">
                                                    <Calendar className="w-4 h-4 text-teal-500" />
                                                    {format(new Date(record.date), 'yyyy.MM.dd')}
                                                </div>
                                                <div className="w-px h-4 bg-slate-300"></div>
                                                <span className="font-bold text-slate-700 truncate">
                                                    {record.title || "（タイトルなし）"}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                                {record.summary || "要点は登録されていません..."}
                                            </p>
                                        </div>
                                        <div className="flex items-center text-teal-500 font-medium text-sm group-hover:translate-x-1 transition-transform self-center shrink-0 ml-2">
                                            <ArrowRight className="w-5 h-5" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Mobile FAB for Add Record */}
            <Link
                href="/import"
                className="md:hidden fixed right-6 bottom-24 z-50 flex items-center justify-center w-14 h-14 bg-teal-600 rounded-full shadow-lg shadow-teal-600/30 text-white transition-transform active:scale-95"
            >
                <Plus className="w-8 h-8" />
            </Link>
        </div >
    );
}
