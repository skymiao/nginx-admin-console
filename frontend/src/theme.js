import { theme } from 'antd';

const colors = {
  primary: '#3B82F6',
  primaryHover: '#2563EB',
  primaryLight: '#60A5FA',
  secondary: '#64748B',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#06B6D4',
  
  background: {
    light: '#FFFFFF',
    dark: '#0F172A',
    surface: '#F8FAFC',
    surfaceDark: '#1E293B'
  },
  
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
    tertiary: '#94A3B8',
    inverse: '#FFFFFF'
  },
  
  border: {
    light: '#E2E8F0',
    dark: '#334155'
  }
};

const fonts = {
  primary: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  code: 'JetBrains Mono, "Fira Code", Consolas, Monaco, monospace'
};

const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
};

const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '9999px'
};

const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px'
};

const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)'
};

const lightTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: colors.primary,
    colorSuccess: colors.success,
    colorWarning: colors.warning,
    colorError: colors.error,
    colorInfo: colors.info,
    colorBgBase: colors.background.light,
    colorBgContainer: colors.background.surface,
    colorBgText: colors.text.primary,
    colorBgTextSecondary: colors.text.secondary,
    colorBorder: colors.border.light,
    borderRadius: borderRadius.md,
    fontFamily: fonts.primary,
    fontSize: 14
  },
  components: {
    Button: {
      borderRadius: borderRadius.md,
      boxShadow: 'none',
      boxShadowSecondary: 'none'
    },
    Card: {
      borderRadius: borderRadius.lg,
      boxShadow: shadows.md
    },
    Table: {
      borderRadius: borderRadius.md,
      headerBg: colors.background.surface,
      headerColor: colors.text.primary
    },
    Input: {
      borderRadius: borderRadius.md,
      boxShadow: 'none'
    },
    Modal: {
      borderRadius: borderRadius.xl
    },
    Form: {
      itemMarginBottom: spacing.md
    }
  }
};

const darkTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: colors.primary,
    colorSuccess: colors.success,
    colorWarning: colors.warning,
    colorError: colors.error,
    colorInfo: colors.info,
    colorBgBase: colors.background.dark,
    colorBgContainer: colors.background.surfaceDark,
    colorBgText: colors.text.inverse,
    colorBgTextSecondary: colors.text.tertiary,
    colorBorder: colors.border.dark,
    borderRadius: borderRadius.md,
    fontFamily: fonts.primary,
    fontSize: 14
  },
  components: {
    Button: {
      borderRadius: borderRadius.md,
      boxShadow: 'none',
      boxShadowSecondary: 'none'
    },
    Card: {
      borderRadius: borderRadius.lg,
      boxShadow: shadows.md
    },
    Table: {
      borderRadius: borderRadius.md,
      headerBg: colors.background.surfaceDark,
      headerColor: colors.text.inverse
    },
    Input: {
      borderRadius: borderRadius.md,
      boxShadow: 'none'
    },
    Modal: {
      borderRadius: borderRadius.xl
    },
    Form: {
      itemMarginBottom: spacing.md
    }
  }
};

export { colors, fonts, shadows, borderRadius, spacing, transitions, lightTheme, darkTheme };
