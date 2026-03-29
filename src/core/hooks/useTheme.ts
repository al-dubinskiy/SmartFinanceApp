import { useColorScheme } from 'react-native';
import { useAppSelector } from '../../store/hooks';
import { Colors } from '../constants/colors';

export const useTheme = () => {
  const systemTheme = useColorScheme();
  const { theme: themePreference } = useAppSelector((state) => state.settings);

  // Определяем актуальную тему
  const getTheme = () => {
    if (themePreference === 'system') {
      return systemTheme || 'light';
    }
    return themePreference;
  };

  const currentTheme = getTheme();
  const colors = currentTheme === 'dark' ? Colors.dark : Colors.light;

  return {
    theme: currentTheme,
    colors,
    isDark: currentTheme === 'dark',
  };
};