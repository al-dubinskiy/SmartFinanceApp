import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UIState } from '../../core/types/store.types';

const initialState: UIState = {
  isLoading: false,
  isRefreshing: false,
  error: null,
  successMessage: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Глобальная загрузка (скелетоны, спиннеры)
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // Pull-to-refresh состояние
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.isRefreshing = action.payload;
    },

    // Установка ошибки
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Установка сообщения об успехе
    setSuccessMessage: (state, action: PayloadAction<string | null>) => {
      state.successMessage = action.payload;
    },

    // Сброс UI состояния
    resetUI: () => initialState,
  },
});

export const {
  setGlobalLoading,
  setRefreshing,
  setError,
  setSuccessMessage,
  resetUI,
} = uiSlice.actions;

export default uiSlice.reducer;