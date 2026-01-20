'use client';

import { useRouter } from 'next/navigation';
import Header from "@/components/Header";
import HealthRecordForm from "@/components/HealthRecordForm";
import { Toaster } from 'react-hot-toast';
import { saveHealthRecord } from '@/app/actions/health-record';

export default function ImportPage() {
    const router = useRouter();

    const handleSuccess = () => {
        router.push('/records');
    };

    const handleSave = async (data: any) => {
        const res = await saveHealthRecord(data);
        if (res.success) {
            handleSuccess();
        }
        return res;
    };

    return (
        <div className="bg-[#FAFAFA] dark:bg-slate-900 min-h-screen pb-20">
            <Header />

            <div className="max-w-3xl mx-auto px-4 pt-8">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">新しい健康データを登録</h1>
                    <p className="text-gray-500 dark:text-slate-400">
                        AI自動入力、OCR、または手入力で健康データを登録できます。
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-6">
                        <HealthRecordForm
                            hideBasicInfo={false}
                            onSubmit={handleSave}
                            onCancel={() => router.push('/records')}
                        />
                    </div>
                </div>
            </div>
            <Toaster position="bottom-right" />
        </div>
    );
}
