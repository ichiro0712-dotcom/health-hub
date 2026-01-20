'use client';

import { toast } from 'react-hot-toast';
import { X, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ErrorToastProps {
    t: any;
    message: string;
}

export default function ErrorToast({ t, message }: ErrorToastProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(message);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white dark:bg-slate-800 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-l-4 border-red-500`}>
            <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                        <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <X className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
                        </div>
                    </div>
                    <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">エラーが発生しました</p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 break-all max-h-32 overflow-y-auto custom-scrollbar">
                            {message}
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex border-l border-gray-200 dark:border-slate-700">
                <button
                    onClick={handleCopy}
                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    {copied ? <Check className="w-5 h-5 text-green-600 dark:text-green-400" /> : <Copy className="w-5 h-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />}
                </button>
            </div>
        </div>
    );
}

// Utility to trigger it easily
export const showErrorToast = (message: string) => {
    toast.custom((t) => <ErrorToast t={t} message={message} />, { duration: 5000 });
};
