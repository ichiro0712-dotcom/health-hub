'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useChatModal } from '@/contexts/ChatModalContext';
import ChatHearingV2 from '@/components/health-profile/ChatHearingV2';

export const CHAT_CONTENT_UPDATED_EVENT = 'chat-content-updated';

export default function ChatModal() {
    const { isChatOpen, closeChat } = useChatModal();
    const [mounted, setMounted] = useState(false);
    const isStreamingRef = useRef(false);

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

    // チャット内のloading状態をMutationObserverで監視
    // （ChatHearingV2がストリーミング中かどうかを検出）
    useEffect(() => {
        if (!isChatOpen) return;

        const checkStreaming = () => {
            // spinner（Loader2 animate-spin）がメッセージエリア内にあるか確認
            const modal = document.querySelector('[data-chat-modal]');
            if (modal) {
                const spinner = modal.querySelector('.animate-spin');
                const sendButton = modal.querySelector('button[disabled]');
                isStreamingRef.current = !!(spinner || sendButton);
            }
        };

        const observer = new MutationObserver(checkStreaming);
        const timer = setTimeout(() => {
            const modal = document.querySelector('[data-chat-modal]');
            if (modal) {
                observer.observe(modal, { childList: true, subtree: true, attributes: true });
            }
        }, 100);

        return () => {
            clearTimeout(timer);
            observer.disconnect();
        };
    }, [isChatOpen]);

    // 安全にクローズ（ストリーミング中は確認）
    const safeClose = useCallback(() => {
        if (isStreamingRef.current) {
            if (!confirm('AIが応答中です。チャットを閉じますか？')) {
                return;
            }
        }
        closeChat();
    }, [closeChat]);

    // ESCキーでクローズ（IME変換中は無視）
    useEffect(() => {
        if (!isChatOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.isComposing) return;
            if (e.key === 'Escape') safeClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isChatOpen, safeClose]);

    const handleContentUpdated = useCallback(() => {
        window.dispatchEvent(new CustomEvent(CHAT_CONTENT_UPDATED_EVENT));
    }, []);

    if (!mounted || !isChatOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center sm:justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={safeClose}
            />
            {/* Modal content */}
            <div
                data-chat-modal
                className="relative w-full h-full sm:h-[85vh] sm:max-w-2xl sm:mx-4 sm:rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-slate-900"
            >
                <ChatHearingV2
                    onContentUpdated={handleContentUpdated}
                    onClose={safeClose}
                />
            </div>
        </div>,
        document.body
    );
}
