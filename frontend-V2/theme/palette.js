// Global brand palette source for the React v2 app.
// For normal product-wide color changes, start here.
// Shared UI theme control is intentionally centered around:
// 1. theme/palette.js
// 2. tailwind.config.js
// 3. src/index.css
// Exceptions: custom graph 2D/3D/list/visualization rendering can keep their own palettes.
export const THEME_PALETTE = {
  brand: {
    primary: '#4a6741', // Moss Green (Nature)
    primaryHover: '#384d31', // Darker Forest
    soft: '#f1f5f0', // Very light Sage
    muted: '#d8e2dc', // Soft Clay Gray
  },
  neutral: {
    canvas: '#fdfcf8', // Bone / Soft Paper
    surface: '#ffffff',
    surfaceMuted: '#f8f9f5', // Tinted Off-white
    text: '#2d3a28', // Deep Moss / Olive
    textStrong: '#121a0f', // Very Dark Forest
    border: '#cbd5c0', // Sage Border
  },
  accent: {
    info: '#84a59d', // Eucalyptus Blue-Green
    infoHover: '#6a8a83', 
    secondaryAction: '#a3b18a', // Sage Accent
    warning: '#bc6c25', // Earthy Brown / Terracotta
    danger: '#ae2012', // Deep Red / Rowan
    success: '#606c38', // Dark Olive
  },
};

