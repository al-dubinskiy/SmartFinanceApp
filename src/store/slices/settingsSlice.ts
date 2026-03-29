import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SettingsState } from '../../core/types/store.types';
import { Colors } from '../../core/constants/colors';

// Начальные настройки
const initialState: SettingsState = {
  theme: 'system',
  currency: 'RUB', // Меняем на рубли
  notificationsEnabled: true,
  language: 'ru', // Меняем на русский
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    // Смена темы
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    },

    // Смена валюты
    setCurrency: (state, action: PayloadAction<string>) => {
      state.currency = action.payload;
    },

    // Включение/отключение уведомлений
    setNotificationsEnabled: (state, action: PayloadAction<boolean>) => {
      state.notificationsEnabled = action.payload;
    },

    // Смена языка
    setLanguage: (state, action: PayloadAction<'en' | 'ru' | 'uk'>) => {
      state.language = action.payload;
    },

    // Сброс настроек
    resetSettings: () => initialState,
  },
});

export const {
  setTheme,
  setCurrency,
  setNotificationsEnabled,
  setLanguage,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;