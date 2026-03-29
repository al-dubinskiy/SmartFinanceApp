// Типы для пользователя
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
}

// Типы для настроек
export interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  notificationsEnabled: boolean;
  language: 'en' | 'ru' | 'uk';
}

// Типы для UI состояния
export interface UIState {
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  successMessage: string | null;
}

// Типы для Auth состояния
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isPinVerified: boolean;
}

// Корневой тип состояния
export interface RootState {
  auth: AuthState;
  settings: SettingsState;
  ui: UIState;
}