'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState, useCallback } from 'react';
import { useChatModal } from '@/contexts/ChatModalContext';
import ChatHearingV2 from '@/components/health-profile/ChatHearingV2';

export const CHAT_CONTENT_UPDATED_EVENT = 'chat-content-updated';

export default function ChatModal() {
    const { isChatOpen, closeChat } = useChatModal();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // body scroll lock
    useEffect(() => {
        if (isChatOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isChatOpen]);

    // ESCキーでクローズ
    useEffect(() => {
        if (!isChatOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeChat();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isChatOpen, closeChat]);

    const handleContentUpdated = useCallback(() => {
        window.dispatchEvent(new CustomEvent(CHAT_CONTENT_UPDATED_EVENT));
    }, []);

    if (!mounted || !isChatOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center sm:justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={closeChat}
            />
            {/* Modal content */}
            <div className="relative w-full h-full sm:h-[85vh] sm:max-w-2xl sm:mx-4 sm:rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-slate-900">
                <ChatHearingV2
                    onContentUpdated={handleContentUpdated}
                    onClose={closeChat}
                />
            </div>
        </div>,
        document.body
    );
}
