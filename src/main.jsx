import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>,
)

// ── Service Worker Registration ──────
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            // Just register it simply without the unregister/reload loop
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('[SW] Registered SW:', registration.scope);

            // Only reload if the user manually clicks an update button (handled elsewhere, or safely suppressed here)
        } catch (error) {
            console.warn('[SW] Registration failed:', error);
        }
    });
}
