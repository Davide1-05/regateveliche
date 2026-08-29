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
const STORAGE_KEYS = {
  TACTICAL_DASHBOARD: 'feature_flag_tactical_dashboard',
} as const;

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
 * Check if a plugin is enabled at runtime (includes localStorage override)
 * @param pluginId - The plugin identifier (e.g., 'tactical_dashboard')
 */
export function isPluginEnabled(pluginId: string): boolean {
  const stored = localStorage.getItem(STORAGE_KEYS[pluginId as keyof typeof STORAGE_KEYS]);
  
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
  const storageKey = STORAGE_KEYS[pluginId as keyof typeof STORAGE_KEYS];
  if (storageKey) {
    localStorage.setItem(storageKey, enabled ? 'true' : 'false');
  }
}

/**
 * Reset a plugin to its build-time default value
 * @param pluginId - The plugin identifier (e.g., 'tactical_dashboard')
 */
export function resetPluginToDefault(pluginId: string): void {
  const storageKey = STORAGE_KEYS[pluginId as keyof typeof STORAGE_KEYS];
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
      enabled: isPluginEnabled('tactical_dashboard'),
      defaultEnabled: BUILD_TIME_FLAGS.TACTICAL_DASHBOARD,
    },
  };
}

// ==================== React Hooks for Plugin State ====================

/**
 * Hook to track if a plugin is enabled with reactive updates
 * @param pluginId - The plugin identifier (e.g., 'tactical_dashboard')
 */
export function usePluginState(pluginId: string): boolean {
  const [enabled, setEnabled] = useState(() => isPluginEnabled(pluginId));

  useEffect(() => {
    const handleStorageChange = () => {
      setEnabled(isPluginEnabled(pluginId));
    };
    
    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom events from same tab
    document.addEventListener(`plugin:${pluginId}:changed`, handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener(`plugin:${pluginId}:changed`, handleStorageChange);
    };
  }, [pluginId]);

  return enabled;
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