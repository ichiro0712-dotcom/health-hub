'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ChatModalContextType {
    isChatOpen: boolean;
    isAIResponding: boolean;
    openChat: () => void;
    closeChat: () => void;
    setIsAIResponding: (v: boolean) => void;
}

const ChatModalContext = createContext<ChatModalContextType | null>(null);

export function ChatModalProvider({ children }: { children: ReactNode }) {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isAIResponding, setIsAIResponding] = useState(false);

    const openChat = useCallback(() => setIsChatOpen(true), []);
    const closeChat = useCallback(() => setIsChatOpen(false), []);

    return (
        <ChatModalContext.Provider value={{ isChatOpen, isAIResponding, openChat, closeChat, setIsAIResponding }}>
            {children}
        </ChatModalContext.Provider>
    );
}

export function useChatModal() {
    const context = useContext(ChatModalContext);
    if (!context) {
        throw new Error('useChatModal must be used within a ChatModalProvider');
    }
    return context;
}
