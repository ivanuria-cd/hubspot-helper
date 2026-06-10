import { create } from 'zustand';
import type { Project } from '@shared/types/project';
import type { UpdaterStatus } from '@shared/types/ipc';
import type { HubSpotEnvironment } from '@shared/types/hubspot';

interface ShellState {
  activeProject: Project | null;
  sidebarCollapsed: boolean;
  updateStatus: UpdaterStatus | null;
  hubspotEnvironment: HubSpotEnvironment | null;
  setActiveProject: (project: Project | null) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setUpdateStatus: (status: UpdaterStatus | null) => void;
  setHubspotEnvironment: (environment: HubSpotEnvironment | null) => void;
}

export const useShellStore = create<ShellState>((set) => ({
  activeProject: null,
  sidebarCollapsed: false,
  updateStatus: null,
  hubspotEnvironment: null,
  setActiveProject: (project) => set({ activeProject: project }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setUpdateStatus: (status) => set({ updateStatus: status }),
  setHubspotEnvironment: (environment) => set({ hubspotEnvironment: environment }),
}));
