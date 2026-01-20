'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import HealthRecordForm, { HealthRecordData } from './HealthRecordForm';

interface HealthRecordModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData: HealthRecordData;
    onSubmit: (data: any) => Promise<{ success: boolean; error?: string }>;
}

export default function HealthRecordModal({ isOpen, onClose, initialData, onSubmit }: HealthRecordModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Clean up on unmount
        return () => setMounted(false);
    }, []);

    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!mounted || !isOpen) return null;

    // Use portal to render at body root
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">記録の編集</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-[#FAFAFA] dark:bg-slate-900">
                    <HealthRecordForm
                        initialData={initialData}
                        onSubmit={async (data) => {
                            const res = await onSubmit(data);
                            if (res.success) {
                                onClose();
                            }
                            return res;
                        }}
                        onCancel={onClose}
                        isModal={true}
                    />
                </div>
            </div>
        </div>,
        document.body
    );
}
