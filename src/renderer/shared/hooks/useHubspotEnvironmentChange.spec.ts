// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHubspotEnvironmentChange } from './useHubspotEnvironmentChange';
import { useShellStore } from '@renderer/app/store/shell-store';

describe('useHubspotEnvironmentChange', () => {
  beforeEach(() => {
    useShellStore.getState().setHubspotEnvironment(null);
  });

  it('no llama a onChange en el montaje', () => {
    const onChange = vi.fn();
    renderHook(() => useHubspotEnvironmentChange(onChange));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('llama a onChange cuando el entorno cambia', () => {
    const onChange = vi.fn();
    renderHook(() => useHubspotEnvironmentChange(onChange));
    act(() => useShellStore.getState().setHubspotEnvironment('production'));
    expect(onChange).toHaveBeenCalledTimes(1);
    act(() => useShellStore.getState().setHubspotEnvironment('sandbox'));
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('no llama a onChange si el entorno no cambia', () => {
    const onChange = vi.fn();
    useShellStore.getState().setHubspotEnvironment('production');
    renderHook(() => useHubspotEnvironmentChange(onChange));
    act(() => useShellStore.getState().setHubspotEnvironment('production'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
