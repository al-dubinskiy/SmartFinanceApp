export const Colors = {
  light: {
    primary: '#4E54C8', // Royal Blue
    success: '#2ECC71', // Emerald Green
    error: '#E74C3C', // Soft Red
    warning: '#F39C12',
    background: '#F5F7FA',
    surface: '#FFFFFF',
    text: {
      primary: '#1A1A1A',
      secondary: '#7F8C8D',
      inverse: '#FFFFFF',
    },
    border: '#E0E0E0',
    card: '#FFFFFF',
    shadow: '#000000',
  },
  dark: {
    primary: '#5D63D1', // Lighter Royal Blue for dark mode
    success: '#2ECC71',
    error: '#E74C3C',
    warning: '#F39C12',
    background: '#121212',
    surface: '#1E1E1E',
    text: {
      primary: '#FFFFFF',
      secondary: '#B0B0B0',
      inverse: '#1A1A1A',
    },
    border: '#2C2C2C',
    card: '#1E1E1E',
    shadow: '#000000',
  },
} as const;

export type ColorScheme = typeof Colors.light;