import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker with notification support
registerSW({
  immediate: true,
  onRegistered() {
    console.log('Service Worker registered');
    if ('Notification' in window) {
      Notification.requestPermission().then((permission) => {
        console.log('Notification permission status:', permission);
        if (permission === 'granted') {
          console.log('Notification permission granted');
        }
      });
    } else {
      console.log('Notifications not supported in this browser');
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);