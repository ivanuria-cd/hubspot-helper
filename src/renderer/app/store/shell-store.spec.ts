import { describe, it, expect, beforeEach } from 'vitest';
import type { Project } from '@shared/types/project';
import { useShellStore } from './shell-store';

const sampleProject: Project = {
  id: 'p1',
  name: 'Cliente X',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastOpenedAt: '2026-01-01T00:00:00.000Z',
  connectors: {},
};

describe('shellStore', () => {
  beforeEach(() => {
    useShellStore.setState({
      activeProject: null,
      sidebarCollapsed: false,
      updateStatus: null,
    });
  });

  it('arranca sin proyecto activo y con el sidebar expandido', () => {
    const state = useShellStore.getState();
    expect(state.activeProject).toBeNull();
    expect(state.sidebarCollapsed).toBe(false);
    expect(state.updateStatus).toBeNull();
  });

  it('establece y limpia el proyecto activo', () => {
    useShellStore.getState().setActiveProject(sampleProject);
    expect(useShellStore.getState().activeProject).toEqual(sampleProject);
    useShellStore.getState().setActiveProject(null);
    expect(useShellStore.getState().activeProject).toBeNull();
  });

  it('alterna el estado de colapso del sidebar', () => {
    const { toggleSidebar } = useShellStore.getState();
    toggleSidebar();
    expect(useShellStore.getState().sidebarCollapsed).toBe(true);
    toggleSidebar();
    expect(useShellStore.getState().sidebarCollapsed).toBe(false);
  });

  it('fija el colapso de forma explícita', () => {
    useShellStore.getState().setSidebarCollapsed(true);
    expect(useShellStore.getState().sidebarCollapsed).toBe(true);
  });

  it('guarda el estado de actualización', () => {
    useShellStore.getState().setUpdateStatus({ state: 'available', version: '1.2.3' });
    expect(useShellStore.getState().updateStatus).toEqual({ state: 'available', version: '1.2.3' });
  });
});
