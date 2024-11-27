import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker with notification support
registerSW({
  immediate: true,
  onRegistered() {
    // Request notification permissions on startup
    const requestNotificationPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        console.log(`Notification permission status: ${permission}`);
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    };

    // Check if it's a PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      requestNotificationPermission();
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);