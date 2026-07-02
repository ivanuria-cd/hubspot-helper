import { BrowserWindow, shell } from 'electron';
import { join } from 'node:path';

const RENDERER_DEV_URL = process.env.ELECTRON_RENDERER_URL;

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#090017',
    icon: join(__dirname, '../../build/icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  window.on('ready-to-show', () => window.show());

  const isSafeExternalUrl = (url: string): boolean => {
    try {
      const { protocol } = new URL(url);
      return protocol === 'http:' || protocol === 'https:';
    } catch {
      return false;
    }
  };

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    const isInternal =
      (RENDERER_DEV_URL && url.startsWith(RENDERER_DEV_URL)) || url.startsWith('file://');
    if (!isInternal) {
      event.preventDefault();
      if (isSafeExternalUrl(url)) {
        void shell.openExternal(url);
      }
    }
  });

  if (RENDERER_DEV_URL) {
    void window.loadURL(RENDERER_DEV_URL);
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return window;
}
