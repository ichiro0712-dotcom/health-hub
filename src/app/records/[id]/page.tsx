import { getRecord } from '../../actions/records';
import { getItemMappings } from '../../actions/items';
import RecordClient from './RecordClient';
import Link from 'next/link';
import Header from '@/components/Header';
import { ChevronLeft } from 'lucide-react';

export default async function RecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const id = (await params).id;
    const { success, data: record } = await getRecord(id);
    const mappings = await getItemMappings();

    if (!success || !record) {
        return (
            <div className="min-h-screen pb-24 md:pb-8">
                <Header />
                <div className="p-8 text-center text-red-500">Record not found</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-24 md:pb-8">
            <Header />
            <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6">
                <div className="mb-6">
                    <Link href="/records" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition">
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        一覧に戻る
                    </Link>
                </div>
                <RecordClient record={record} mappings={mappings} />
            </div>
        </div>
    );
}
