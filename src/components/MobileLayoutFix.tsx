'use client';

import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

export default function MobileLayoutFix() {
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            const configureStatusBar = async () => {
                try {
                    // Make status bar transparent and overlay the webview
                    await StatusBar.setOverlaysWebView({ overlay: true });
                    // Set style to dark (dark icons) or light based on theme, defaulting to dark for now
                    await StatusBar.setStyle({ style: Style.Dark });
                } catch (e) {
                    console.error('Error configuring status bar:', e);
                }
            };
            configureStatusBar();
        }
    }, []);

    return null;
}
