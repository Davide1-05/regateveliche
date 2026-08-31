/**
 * Feature Flags Configuration
 *
 * This module provides centralized control over optional features/plug-ins
 * in the application. Features can be enabled/disabled via:
 * 1. Environment variables (VITE_ prefix) - build-time configuration
 * 2. localStorage overrides - runtime user preference (client-side only)
 */

import { useState, useEffect } from 'react';

// Storage keys for feature flags in localStorage
/**
 * Storage keys for feature flags in localStorage.
 * Uses snake_case format to match the pluginId convention.
 */
const STORAGE_KEYS: Record<string, string> = {
  TACTICAL_DASHBOARD: 'feature_flag_tactical_dashboard',
  tactical_dashboard: 'feature_flag_tactical_dashboard',
};

// Build-time feature flag values from environment variables
const BUILD_TIME_FLAGS = {
  /**
   * Tactical Dashboard Plugin
   * When enabled, provides real-time WRS analysis and optimized route segments
   * Environment variable: VITE_FEATURE_TACTICAL_DASHBOARD
   */
  TACTICAL_DASHBOARD: import.meta.env.VITE_FEATURE_TACTICAL_DASHBOARD === 'true',

  /**
   * Future feature flags can be added here:
   * - WEATHER_INTEGRATION: import.meta.env.VITE_FEATURE_WEATHER === 'true'
   * - LIVE_TRACKING: import.meta.env.VITE_FEATURE_LIVE_TRACKING === 'true'
   */
} as const;

// Feature flag definitions with defaults (combines build-time + runtime)
// Note: These are primarily used for backward compatibility.
// For new code, prefer using isPluginEnabled() which includes localStorage overrides.
export const FEATURE_FLAGS = {
  TACTICAL_DASHBOARD: BUILD_TIME_FLAGS.TACTICAL_DASHBOARD,
} as const;

/**
 * @deprecated Use isPluginEnabled('tactical_dashboard') instead for runtime-aware checks
 */
export const useFeatureFlag = FEATURE_FLAGS;

// Type-safe feature flag keys
export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

/**
 * Check if a specific feature is enabled (build-time only, no runtime override)
 */
export function isFeatureEnabled(feature: FeatureFlagKey): boolean {
  return FEATURE_FLAGS[feature] ?? false;
}

/**
 * Get all feature flags as an object (useful for API responses)
 */
export function getAllFeatureFlags(): Record<string, boolean> {
  return { ...FEATURE_FLAGS };
}

// ==================== Runtime Plugin Management ====================

/**
 * Helper to get the localStorage key for a plugin ID
 * @param pluginId - The plugin identifier (e.g., 'tactical_dashboard')
 * @returns The localStorage key or null if not found
 */
function getStorageKey(pluginId: string): string | null {
  // Try direct key match first (e.g., 'tactical_dashboard')
  let storageKey = STORAGE_KEYS[pluginId];
  
  // If not found, try converting to uppercase for BUILD_TIME_FLAGS lookup
  if (!storageKey) {
    const upperKey = pluginId.toUpperCase();
    storageKey = STORAGE_KEYS[upperKey];
  }
  
  // Fallback: construct key using the standard prefix pattern
  if (!storageKey) {
    return `feature_flag_${pluginId}`;
  }
  
  return storageKey;
}

/**
 * Check if a plugin is enabled at runtime (includes localStorage override)
 * @param pluginId - The plugin identifier (e.g., 'tactical_dashboard')
 */
export function isPluginEnabled(pluginId: string): boolean {
  const storageKey = getStorageKey(pluginId);
  
  if (!storageKey) {
    return false;
  }
  
  const stored = localStorage.getItem(storageKey);
  
  if (stored === null) {
    // No override - use build-time value
    return BUILD_TIME_FLAGS[pluginId.toUpperCase() as keyof typeof BUILD_TIME_FLAGS] ?? false;
  }
  
  return stored === 'true';
}

/**
 * Enable or disable a plugin at runtime
 * @param pluginId - The plugin identifier (e.g., 'tactical_dashboard')
 * @param enabled - Whether to enable the plugin
 */
export function setPluginEnabled(pluginId: string, enabled: boolean): void {
  const storageKey = getStorageKey(pluginId);
  
  if (storageKey) {
    localStorage.setItem(storageKey, enabled ? 'true' : 'false');
  }
}

/**
 * Reset a plugin to its build-time default value
 * @param pluginId - The plugin identifier (e.g., 'tactical_dashboard')
 */
export function resetPluginToDefault(pluginId: string): void {
  const storageKey = getStorageKey(pluginId);
  
  if (storageKey) {
    localStorage.removeItem(storageKey);
  }
}

/**
 * Get all available plugins with their current status
 */
export function getAvailablePlugins(): Record<string, { name: string; enabled: boolean; defaultEnabled: boolean }> {
  return {
    tactical_dashboard: {
      name: 'Tactical Dashboard',
      // Use the actual runtime state from isPluginEnabled()
      enabled: isPluginEnabled('tactical_dashboard'),
      defaultEnabled: BUILD_TIME_FLAGS.TACTICAL_DASHBOARD,
    },
  };
}

// ==================== React Context for Plugin State ====================

import { createContext, useContext, useCallback } from 'react';

interface PluginContextValue {
  state: Record<string, boolean>;
  togglePlugin: (pluginId: string) => void;
  enablePlugin: (pluginId: string) => void;
  disablePlugin: (pluginId: string) => void;
}

const PluginContext = createContext<PluginContextValue | null>(null);

/**
 * Provider component that broadcasts plugin state changes to all subscribers.
 * All components using usePluginState will automatically update when this provider dispatches events.
 */
export function PluginProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Record<string, boolean>>(() => ({
    tactical_dashboard: isPluginEnabled('tactical_dashboard'),
  }));

  // Listen for storage changes (cross-tab) and custom events (same tab)
  useEffect(() => {
    const handleStorageChange = () => {
      setState(prev => ({
        ...prev,
        tactical_dashboard: isPluginEnabled('tactical_dashboard'),
      }));
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('plugin:tactical_dashboard:changed', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('plugin:tactical_dashboard:changed', handleStorageChange);
    };
  }, []);

  const togglePlugin = useCallback((pluginId: string) => {
    setPluginEnabled(pluginId, !isPluginEnabled(pluginId));
    setState(prev => ({ ...prev, [pluginId]: !isPluginEnabled(pluginId) }));
    document.dispatchEvent(new Event(`plugin:${pluginId}:changed`));
  }, []);

  const enablePlugin = useCallback((pluginId: string) => {
    setPluginEnabled(pluginId, true);
    setState(prev => ({ ...prev, [pluginId]: true }));
    document.dispatchEvent(new Event(`plugin:${pluginId}:changed`));
  }, []);

  const disablePlugin = useCallback((pluginId: string) => {
    setPluginEnabled(pluginId, false);
    setState(prev => ({ ...prev, [pluginId]: false }));
    document.dispatchEvent(new Event(`plugin:${pluginId}:changed`));
  }, []);

  return (
    <PluginContext.Provider value={{ state, togglePlugin, enablePlugin, disablePlugin }}>
      {children}
    </PluginContext.Provider>
  );
}

/**
 * Hook to track if a plugin is enabled with reactive updates
 * @param pluginId - The plugin identifier (e.g., 'tactical_dashboard')
 */
export function usePluginState(pluginId: string): boolean {
  const context = useContext(PluginContext);
  
  // Fallback for when used outside provider
  if (!context) {
    return isPluginEnabled(pluginId);
  }

  return context.state[pluginId] ?? false;
}

/**
 * Hook to manage a plugin's state with toggle functionality
 */
export function usePluginManagement(pluginId: string) {
  const enabled = usePluginState(pluginId);
  
  const toggle = () => {
    setPluginEnabled(pluginId, !enabled);
    document.dispatchEvent(new Event(`plugin:${pluginId}:changed`));
  };
  
  const enable = () => {
    setPluginEnabled(pluginId, true);
    document.dispatchEvent(new Event(`plugin:${pluginId}:changed`));
  };
  
  const disable = () => {
    setPluginEnabled(pluginId, false);
    document.dispatchEvent(new Event(`plugin:${pluginId}:changed`));
  };
  
  const reset = () => {
    resetPluginToDefault(pluginId);
    document.dispatchEvent(new Event(`plugin:${pluginId}:changed`));
  };

  return { enabled, toggle, enable, disable, reset };
}

// Export default for convenience imports
export default FEATURE_FLAGS;