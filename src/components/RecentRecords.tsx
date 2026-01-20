'use client';

import { CheckCircle, ArrowRight, Calendar, FileText } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface RecentRecordsProps {
    records: any[];
}

export default function RecentRecords({ records }: RecentRecordsProps) {
    if (records.length === 0) {
        return (
            <div className="text-center py-10 px-4 bg-slate-50 border-t border-slate-100">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <FileText className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium mb-1">まだ記録がありません</p>
                <p className="text-xs text-slate-400">健康診断書をアップロードして分析を始めましょう</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 divide-y divide-slate-50 dark:divide-slate-700">
                {records.map((record) => (
                    <Link
                        href={`/records/${record.id}`}
                        key={record.id}
                        className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition group"
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-teal-50 dark:bg-teal-900/30 rounded-full text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform">
                                    <CheckCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm mb-1 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                                        {record.additional_data?.hospitalName || "病院名未設定"}
                                    </h3>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(record.date), 'yyyy/MM/dd')}
                                        </div>
                                        <div className="w-1 h-1 bg-slate-200 dark:bg-slate-600 rounded-full"></div>
                                        <span>{record.data?.length || 0} 項目</span>
                                    </div>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-teal-500 dark:group-hover:text-teal-400 transition-transform group-hover:translate-x-1" />
                        </div>
                    </Link>
                ))}
            </div>

            <div className="p-4 border-t border-slate-50 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-700/30 mt-auto">
                <Link
                    href="/records"
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-bold text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                >
                    すべての記録を見る <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    );
}
