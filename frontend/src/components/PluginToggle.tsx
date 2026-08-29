import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePluginState, isPluginEnabled } from '../config/featureFlags';

interface PluginToggleProps {
  pluginId: string;
  className?: string;
  showLabel?: boolean;
  showReset?: boolean;
}

/**
 * A toggle component for enabling/disabling plugins at runtime.
 * Note: Changes are stored in localStorage and only affect the current browser session.
 */
const PluginToggle: React.FC<PluginToggleProps> = ({
  pluginId,
  className = '',
  showLabel = true,
  showReset = false,
}) => {
  const { t } = useTranslation();
  const enabled = usePluginState(pluginId);
  
  // Check if the build-time default allows this plugin
  const isBuildEnabled = isPluginEnabled(pluginId) && !localStorage.getItem(`feature_flag_${pluginId}`);

  const handleToggle = () => {
    const currentStatus = isPluginEnabled(pluginId);
    
    if (currentStatus) {
      // Disable the plugin
      localStorage.setItem(`feature_flag_${pluginId}`, 'false');
    } else {
      // Enable the plugin - check if build-time allows it
      if (isBuildEnabled) {
        localStorage.setItem(`feature_flag_${pluginId}`, 'true');
      }
      // If build-time doesn't allow, do nothing (show notification could be added here)
    }
    
    // Dispatch custom event for reactive updates
    document.dispatchEvent(new Event(`plugin:${pluginId}:changed`));
  };

  const handleReset = () => {
    localStorage.removeItem(`feature_flag_${pluginId}`);
    document.dispatchEvent(new Event(`plugin:${pluginId}:changed`));
  };

  // Determine toggle state for display
  const isCurrentlyEnabled = isPluginEnabled(pluginId);
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showLabel && (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {t('plugins.tacticalDashboard') || 'Tactical Dashboard'}
        </span>
      )}
      
      <button
        onClick={handleToggle}
        disabled={!isBuildEnabled && !isCurrentlyEnabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 ${
          isCurrentlyEnabled
            ? 'bg-cyan-600'
            : !isBuildEnabled
            ? 'bg-gray-300 cursor-not-allowed dark:bg-gray-700'
            : 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-600'
        }`}
        role="switch"
        aria-checked={isCurrentlyEnabled}
        title={!isBuildEnabled && !isCurrentlyEnabled 
          ? t('plugins.pluginDisabledByConfig') || 'This plugin is disabled by configuration'
          : ''}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isCurrentlyEnabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>

      {isCurrentlyEnabled && showReset && (
        <button
          onClick={handleReset}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          title={t('plugins.resetToDefault') || 'Reset to build-time default'}
        >
          ↺
        </button>
      )}

      {isCurrentlyEnabled && (
        <span className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">
          ON
        </span>
      )}
    </div>
  );
};

export default PluginToggle;