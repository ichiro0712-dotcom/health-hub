'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState, useCallback } from 'react';
import { useChatModal } from '@/contexts/ChatModalContext';
import ChatHearingV2 from '@/components/health-profile/ChatHearingV2';

export const CHAT_CONTENT_UPDATED_EVENT = 'chat-content-updated';

export default function ChatModal() {
    const { isChatOpen, closeChat } = useChatModal();
    const [mounted, setMounted] = useState(false);
    // 一度でも開いたらChatHearingV2をマウントし続ける
    const [hasBeenOpened, setHasBeenOpened] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // 初めて開いたらフラグを立てる
    useEffect(() => {
        if (isChatOpen && !hasBeenOpened) {
            setHasBeenOpened(true);
        }
    }, [isChatOpen, hasBeenOpened]);

    // body scroll lock
    useEffect(() => {
        if (isChatOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isChatOpen]);

    // ESCキーでクローズ（IME変換中は無視）
    useEffect(() => {
        if (!isChatOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.isComposing) return;
            if (e.key === 'Escape') closeChat();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isChatOpen, closeChat]);

    const handleContentUpdated = useCallback(() => {
        window.dispatchEvent(new CustomEvent(CHAT_CONTENT_UPDATED_EVENT));
    }, []);

    if (!mounted) return null;

    // 一度も開いてなければ何もレンダリングしない
    if (!hasBeenOpened) return null;

    return createPortal(
        <div
            className={`fixed inset-0 z-[80] flex items-end sm:items-center sm:justify-center p-3 sm:p-4 transition-opacity duration-200 ${
                isChatOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={closeChat}
            />
            {/* Modal content - 常時マウント、表示/非表示で切り替え */}
            <div
                data-chat-modal
                className={`relative w-full h-[92vh] sm:h-[85vh] max-w-2xl rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-slate-900 transition-transform duration-200 ${
                    isChatOpen ? 'translate-y-0' : 'translate-y-8'
                }`}
            >
                <ChatHearingV2
                    onContentUpdated={handleContentUpdated}
                    onClose={closeChat}
                    isVisible={isChatOpen}
                />
            </div>
        </div>,
        document.body
    );
}
