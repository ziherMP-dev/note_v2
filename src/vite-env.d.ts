/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Navigator {
  standalone?: boolean;
}

interface Window {
  navigator: Navigator;
}

declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
  }
  export function registerSW(options?: RegisterSWOptions): void;
}
