import type { BrowserWindow } from 'electron';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IpcChannels } from '@shared/types/ipc';

const { updaterMock } = vi.hoisted(() => {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  const mock = {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    checkForUpdates: vi.fn().mockResolvedValue(undefined),
    on(event: string, callback: (...args: unknown[]) => void) {
      handlers[event] = callback;
      return mock;
    },
    emit(event: string, ...args: unknown[]) {
      handlers[event]?.(...args);
    },
    removeAllListeners() {
      for (const key of Object.keys(handlers)) delete handlers[key];
    },
  };
  return { updaterMock: mock };
});

vi.mock('electron-updater', () => ({ autoUpdater: updaterMock }));

import { registerUpdaterEvents, emitStatus, checkForUpdates } from './updater';

function fakeWindow() {
  const send = vi.fn();
  return { win: { webContents: { send } } as unknown as BrowserWindow, send };
}

describe('updater — eventos IPC', () => {
  beforeEach(() => {
    updaterMock.removeAllListeners();
    updaterMock.checkForUpdates.mockClear();
  });

  it('emitStatus envía el estado por el canal updater:status', () => {
    const { win, send } = fakeWindow();
    emitStatus(() => win, { state: 'checking' });
    expect(send).toHaveBeenCalledWith(IpcChannels.updaterStatus, { state: 'checking' });
  });

  it('no falla cuando no hay ventana', () => {
    expect(() => emitStatus(() => null, { state: 'not-available' })).not.toThrow();
  });

  it('mapea cada evento de electron-updater al payload correcto', () => {
    const { win, send } = fakeWindow();
    registerUpdaterEvents(() => win);

    updaterMock.emit('checking-for-update');
    updaterMock.emit('update-available', { version: '1.2.3' });
    updaterMock.emit('update-not-available');
    updaterMock.emit('download-progress', { percent: 42.7 });
    updaterMock.emit('update-downloaded', { version: '1.2.3' });
    updaterMock.emit('error', new Error('boom'));

    expect(send).toHaveBeenNthCalledWith(1, IpcChannels.updaterStatus, { state: 'checking' });
    expect(send).toHaveBeenNthCalledWith(2, IpcChannels.updaterStatus, {
      state: 'available',
      version: '1.2.3',
    });
    expect(send).toHaveBeenNthCalledWith(3, IpcChannels.updaterStatus, { state: 'not-available' });
    expect(send).toHaveBeenNthCalledWith(4, IpcChannels.updaterStatus, {
      state: 'downloading',
      percent: 43,
    });
    expect(send).toHaveBeenNthCalledWith(5, IpcChannels.updaterStatus, {
      state: 'downloaded',
      version: '1.2.3',
    });
    expect(send).toHaveBeenNthCalledWith(6, IpcChannels.updaterStatus, {
      state: 'error',
      message: 'boom',
    });
  });

  it('configura autoDownload y delega checkForUpdates en autoUpdater', () => {
    registerUpdaterEvents(() => null);
    expect(updaterMock.autoDownload).toBe(true);
    checkForUpdates();
    expect(updaterMock.checkForUpdates).toHaveBeenCalledTimes(1);
  });
});
