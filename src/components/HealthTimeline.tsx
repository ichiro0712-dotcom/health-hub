'use client';

import { TrendRecord } from '@/app/actions/trends';
import { Calendar, FileText, ImageIcon, ChevronRight } from "lucide-react";
import Link from 'next/link';

interface HealthTimelineProps {
    records: TrendRecord[];
}

export default function HealthTimeline({ records }: HealthTimelineProps) {
    // Reverse order for timeline (newest first)
    const sortedRecords = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="relative border-l-2 border-gray-100 ml-3 space-y-8 py-4">
            {sortedRecords.map((record) => (
                <div key={record.id} className="ml-6 relative group">
                    {/* Timestamp Dot */}
                    <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-2 border-[#00CED1] group-hover:bg-[#00CED1] transition-colors shadow-sm" />

                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-[#00CED1]" />
                                    {record.date}
                                </h3>
                                {record.hospital && (
                                    <p className="text-sm text-gray-500 mt-0.5 ml-6">{record.hospital}</p>
                                )}
                            </div>
                            <Link
                                href={`/records/${record.id}`}
                                className="text-xs text-[#00CED1] font-medium flex items-center hover:underline"
                            >
                                詳細を見る <ChevronRight className="w-3 h-3" />
                            </Link>
                        </div>

                        {/* Notes Section */}
                        {record.notes ? (
                            <div className="bg-amber-50 rounded-lg p-3 text-sm text-gray-700 mb-3 border border-amber-100">
                                <div className="flex items-center gap-2 mb-1 text-amber-600 font-bold text-xs uppercase tracking-wider">
                                    <FileText className="w-3 h-3" />
                                    医師のコメント・所見
                                </div>
                                <p className="whitespace-pre-wrap leading-relaxed">{record.notes}</p>
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 italic mb-3">医師のコメントはありません</p>
                        )}

                        {/* Images Section */}
                        {record.images.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {record.images.map((img, idx) => (
                                    <div key={idx} className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                                        <img src={img} alt="result" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        )}
                        {record.images.length === 0 && (
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <ImageIcon className="w-3 h-3" /> 画像なし
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {records.length === 0 && (
                <div className="ml-6 text-gray-400 text-sm">記録がまだありません。</div>
            )}
        </div>
    );
}
