import { useEffect, useRef } from 'react';
import { useShellStore } from '@renderer/app/store/shell-store';
import type { HubSpotEnvironment } from '@shared/types/hubspot';

/**
 * Ejecuta `onChange` cuando cambia el entorno activo de HubSpot (SPEC-0003 §16).
 * Omite el montaje inicial: las pantallas ya cargan en su `useEffect` de `projectId`.
 */
export function useHubspotEnvironmentChange(onChange: () => void): void {
  const environment = useShellStore((state) => state.hubspotEnvironment);
  const previous = useRef<HubSpotEnvironment | null>(environment);
  useEffect(() => {
    if (previous.current === environment) return;
    previous.current = environment;
    onChange();
  }, [environment, onChange]);
}
