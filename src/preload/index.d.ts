import type { RevOpsApi } from '@shared/types/ipc';

declare global {
  interface Window {
    api: RevOpsApi;
  }
}

export {};
