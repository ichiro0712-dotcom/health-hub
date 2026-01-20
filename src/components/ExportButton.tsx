'use client';

import { exportToNotebookML } from "@/app/actions/export";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { showErrorToast } from './ErrorToast';

export default function ExportButton() {
    const [loading, setLoading] = useState(false);

    async function handleExport() {
        setLoading(true);
        try {
            const res = await exportToNotebookML();
            if (res.success && res.markdown) {
                // Create a blob and download
                const blob = new Blob([res.markdown], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `health-hub-export-${new Date().toISOString().split('T')[0]}.md`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                toast.success("NotebookLM用にエクスポートしました！");
            } else {
                showErrorToast("エクスポートに失敗しました");
            }
        } catch (e) {
            showErrorToast("エクスポートエラー");
        } finally {
            setLoading(false);
        }
    }

    return (
        <button
            onClick={handleExport}
            disabled={loading}
            className="px-4 py-2 bg-[#00CED1] text-white rounded-lg hover:bg-[#00acc1] transition flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow disabled:opacity-70"
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span className="hidden sm:inline">エクスポート</span>
        </button>
    );
}
