# Tactical Dashboard Plugin - Configuration Guide

## Overview

The Tactical Dashboard is now an optional, configurable plugin that can be enabled or disabled at:
1. **Build-time** via environment variables
2. **Runtime** via user-facing toggle in the Dashboard page (when enabled)

---

## Enabling/Disabling the Plugin

### Method 1: Build-Time Configuration (Recommended for Production)

Add the following to your `.env` file in the `frontend/` directory:

```env
# Enable Tactical Dashboard plugin (default: false)
VITE_FEATURE_TACTICAL_DASHBOARD=true
```

To **disable** it by default:
```env
VITE_FEATURE_TACTICAL_DASHBOARD=false
```

Or simply omit the variable - it defaults to `false`.

### Method 2: Runtime Configuration (User Toggle)

When the Tactical Dashboard plugin is enabled at build-time, users can toggle it on/off via the Dashboard page. The setting is stored in `localStorage` and persists across sessions.

**Storage Key:** `feature_flag_tactical_dashboard`
- `"true"` = Enabled
- `"false"` = Disabled
- Not set = Uses build-time default

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    Plugin Resolution Order                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Check localStorage override                             │
│     ↓ (not set?)                                            │
│  2. Fall back to build-time default (VITE_ env var)        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Files Modified

| File | Purpose |
|------|---------|
| [`frontend/src/config/featureFlags.ts`](frontend/src/config/featureFlags.ts) | Plugin configuration and runtime management |
| [`frontend/src/components/PluginToggle.tsx`](frontend/src/components/PluginToggle.tsx) | UI toggle component for users |
| [`frontend/src/pages/DashboardPage.tsx`](frontend/src/pages/DashboardPage.tsx) | Added plugin section and conditional rendering |
| [`frontend/src/i18n/locales/*.json`](frontend/src/i18n/locales/) | Plugin-related translations (5 languages) |

---

## Environment Variables Reference

```env
# Tactical Dashboard Plugin
VITE_FEATURE_TACTICAL_DASHBOARD=true    # Enable at build-time
```

### Future-Proofing

The system is designed to support additional plugins. To add a new plugin:

1. Add storage key to `STORAGE_KEYS` in [`featureFlags.ts`](frontend/src/config/featureFlags.ts:13)
2. Add build-time flag to `BUILD_TIME_FLAGS` in [`featureFlags.ts`](frontend/src/config/featureFlags.ts:18)
3. Add plugin info to `getAvailablePlugins()` in [`featureFlags.ts`](frontend/src/config/featureFlags.ts:105)

---

## Verification Steps

### 1. Check Build Configuration
```bash
# In frontend directory
cat .env | grep TACTICAL_DASHBOARD
```

### 2. Verify Plugin is Available
After enabling, navigate to Dashboard and look for:
- "Tactical Command" button in Quick Actions (cyan styled)
- "Plugin Settings" section at the bottom of the page

### 3. Test Runtime Toggle
1. Enable Tactical Dashboard via env var
2. Start the dev server
3. Navigate to Dashboard
4. Use the plugin toggle switch
5. Refresh - state should persist

---

## Troubleshooting

### Plugin not showing up?
- Check that `VITE_FEATURE_TACTICAL_DASHBOARD=true` is set
- Restart the Vite dev server after changing env vars
- Clear browser localStorage if stuck in disabled state:
  ```javascript
  localStorage.removeItem('feature_flag_tactical_dashboard');
  ```

### Toggle not working?
- Verify the plugin is enabled at build-time first
- Check browser console for errors
- Ensure `PluginToggle.tsx` was created correctly

---

## Security Considerations

⚠️ **Important:** Runtime plugin toggles are **client-side only**. They do NOT affect:
- Backend API endpoints
- Server-side rendering
- Other users' experiences

For production deployments where the plugin should be server-controlled, implement additional backend checks using the `isPluginEnabled()` function pattern.

---

## Quick Start Commands

```bash
# 1. Enable Tactical Dashboard for development
echo "VITE_FEATURE_TACTICAL_DASHBOARD=true" >> frontend/.env

# 2. Start dev server
npm run dev --prefix frontend

# 3. Navigate to http://localhost:5173/dashboard
#    Look for the Tactical Command button and Plugin Settings section