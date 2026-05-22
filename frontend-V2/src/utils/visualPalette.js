import { THEME_PALETTE } from '../../theme/palette.js';

/**
 * Single source for app semantic colors (except graph node/relation palettes).
 */
export const BRAND_COLORS = {
  brandPrimary: THEME_PALETTE.brand.primary,
  brandPrimaryHover: THEME_PALETTE.brand.primaryHover,
  brandSoft: THEME_PALETTE.brand.soft,
  brandMuted: THEME_PALETTE.brand.muted,
  neutralCanvas: THEME_PALETTE.neutral.canvas,
  neutralText: THEME_PALETTE.neutral.text,
  neutralTextStrong: THEME_PALETTE.neutral.textStrong,
  neutralBorder: THEME_PALETTE.neutral.border,
  accentInfo: THEME_PALETTE.accent.info,
  accentInfoHover: THEME_PALETTE.accent.infoHover,
  accentSecondaryAction: THEME_PALETTE.accent.secondaryAction,
  accentWarning: THEME_PALETTE.accent.warning,
  accentDanger: THEME_PALETTE.accent.danger,
  // Backward-compatible aliases used in existing pages/components
  emerald: THEME_PALETTE.brand.primary,
  sage: THEME_PALETTE.brand.soft,
  moss: THEME_PALETTE.brand.muted,
  cloud: THEME_PALETTE.neutral.canvas,
  slate: THEME_PALETTE.neutral.text,
  cyan: THEME_PALETTE.accent.info,
  teal: THEME_PALETTE.accent.secondaryAction,
  amber: THEME_PALETTE.accent.warning,
  rose: THEME_PALETTE.accent.danger,
};

export const VISUAL_PALETTE = [
  BRAND_COLORS.brandPrimary,
  BRAND_COLORS.neutralText,
  BRAND_COLORS.accentInfo,
  BRAND_COLORS.brandSoft,
  BRAND_COLORS.brandMuted,
];

export const getStatusColor = (status) => {
  switch (status) {
    case 'success':
    case 'healthy':
    case 'up':
      return BRAND_COLORS.brandPrimary;
    case 'warning':
    case 'degraded':
      return BRAND_COLORS.accentWarning;
    case 'error':
    case 'danger':
    case 'unhealthy':
    case 'down':
      return BRAND_COLORS.accentDanger;
    default:
      return BRAND_COLORS.brandSoft;
  }
};
