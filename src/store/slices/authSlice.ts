import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User } from '../../core/types/store.types';

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isPinVerified: false, // Переименовали для ясности
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },

    loginSuccess: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
      state.isPinVerified = false; // Сбрасываем при новом входе
    },

    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
      state.user = null;
      state.isPinVerified = false;
    },

    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isPinVerified = false;
      state.error = null;
    },

    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },

    setPinVerified: (state, action: PayloadAction<boolean>) => {
      state.isPinVerified = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setLoading,
  loginSuccess,
  loginFailure,
  logout,
  updateUser,
  setPinVerified,
  clearError,
} = authSlice.actions;

export default authSlice.reducer;