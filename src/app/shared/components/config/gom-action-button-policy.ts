export type GomButtonContentMode = 'icon-only' | 'text-only' | 'icon-text';

export type GomActionButtonRole = 'primary-action' | 'danger-action' | 'secondary-action' | 'dismiss';

export interface GomActionButtonPolicy {
  primaryAction: GomButtonContentMode;
  dangerAction: GomButtonContentMode;
  secondaryAction: GomButtonContentMode;
  dismissAction: GomButtonContentMode;
}

// Global button content policy for multi-action areas (modal footers, card action sections).
// Change values here once to update behavior across modules.
export const GOM_ACTION_BUTTON_POLICY: GomActionButtonPolicy = {
  primaryAction: 'icon-only',
  dangerAction: 'icon-only',
  secondaryAction: 'icon-only',
  dismissAction: 'text-only',
};

export function getButtonContentMode(role: GomActionButtonRole): GomButtonContentMode {
  switch (role) {
    case 'primary-action':
      return GOM_ACTION_BUTTON_POLICY.primaryAction;
    case 'danger-action':
      return GOM_ACTION_BUTTON_POLICY.dangerAction;
    case 'secondary-action':
      return GOM_ACTION_BUTTON_POLICY.secondaryAction;
    case 'dismiss':
      return GOM_ACTION_BUTTON_POLICY.dismissAction;
    default:
      return 'icon-text';
  }
}

export function showButtonIcon(mode: GomButtonContentMode): boolean {
  return mode === 'icon-only' || mode === 'icon-text';
}

export function showButtonText(mode: GomButtonContentMode): boolean {
  return mode === 'text-only' || mode === 'icon-text';
}
