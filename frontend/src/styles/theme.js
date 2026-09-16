// Professional Cybersecurity Theme Configuration
// Inspired by Hack The Box and TryHackMe

export const theme = {
  colors: {
    // Background layers
    bg: {
      primary: '#05010B',
      secondary: '#0A0514',
      tertiary: '#140824',
      elevated: '#1B0D30',
      hover: '#2E1065',
    },
    
    // Primary accent (cyan/blue)
    primary: {
      50: '#e0f7ff',
      100: '#b3e9ff',
      200: '#80dbff',
      300: '#4dcdff',
      400: '#26c0ff',
      500: '#A855F7',
      600: '#9333EA',
      700: '#008fcc',
      800: '#007bb3',
      900: '#005a8c',
    },
    
    // Success (green)
    success: {
      50: '#e6f9f0',
      100: '#b3efd4',
      200: '#80e5b8',
      300: '#4ddb9c',
      400: '#26d386',
      500: '#00cb70',
      600: '#00b866',
      700: '#00a159',
      800: '#008a4d',
      900: '#006637',
    },
    
    // Warning (orange)
    warning: {
      50: '#fff5e6',
      100: '#ffe4b3',
      200: '#ffd380',
      300: '#ffc24d',
      400: '#ffb526',
      500: '#ffa800',
      600: '#e69900',
      700: '#cc8800',
      800: '#b37700',
      900: '#8c5c00',
    },
    
    // Danger (red)
    danger: {
      50: '#ffe6e6',
      100: '#ffb3b3',
      200: '#ff8080',
      300: '#ff4d4d',
      400: '#ff2626',
      500: '#ff0000',
      600: '#e60000',
      700: '#cc0000',
      800: '#b30000',
      900: '#8c0000',
    },
    
    // Info (purple)
    info: {
      50: '#f3e6ff',
      100: '#dcb3ff',
      200: '#c580ff',
      300: '#ae4dff',
      400: '#9d26ff',
      500: '#8c00ff',
      600: '#7d00e6',
      700: '#6e00cc',
      800: '#5f00b3',
      900: '#49008c',
    },
    
    // Text
    text: {
      primary: '#e8eaed',
      secondary: '#9ca3af',
      tertiary: '#6b7280',
      disabled: '#4b5563',
      inverse: '#05010B',
    },
    
    // Borders
    border: {
      primary: '#2E1065',
      secondary: '#140824',
      focus: '#A855F7',
      danger: '#ff0000',
      success: '#00cb70',
    },
    
    // Status
    status: {
      online: '#00cb70',
      offline: '#6b7280',
      away: '#ffa800',
      busy: '#ff0000',
    },
    
    // Difficulty colors
    difficulty: {
      easy: '#00cb70',
      medium: '#ffa800',
      hard: '#ff4d4d',
      insane: '#8c00ff',
    },
    
    // Special effects
    glow: {
      primary: 'rgba(168, 85, 247, 0.4)',
      success: 'rgba(0, 203, 112, 0.4)',
      danger: 'rgba(255, 0, 0, 0.4)',
      warning: 'rgba(255, 168, 0, 0.4)',
    },
  },
  
  fonts: {
    mono: '"JetBrains Mono", "Fira Code", "Consolas", "Monaco", monospace',
    sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", sans-serif',
    heading: '"Space Grotesk", "Inter", sans-serif',
  },
  
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
    glow: '0 0 20px rgba(168, 85, 247, 0.3)',
    glowSuccess: '0 0 20px rgba(0, 203, 112, 0.3)',
    glowDanger: '0 0 20px rgba(255, 0, 0, 0.3)',
  },
  
  borderRadius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    full: '9999px',
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
  },
};

export default theme;
