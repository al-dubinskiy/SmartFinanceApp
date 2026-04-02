import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

// Типы для Auth Stack
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ResetPassword: undefined;
  PinCode: undefined;
};

// Типы для Main Bottom Tabs
export type MainTabParamList = {
  Home: undefined;
  Analytics: undefined;
  AddTransaction: undefined; // Это будет FAB, не экран
  Planning: undefined;
  Profile: undefined;
};

// Типы для Root Stack (который объединяет Auth и Main)
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  PinCode: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  AddTransactionModal: undefined; // Модальное окно для добавления транзакции
  SetupPin: undefined; // Модальное окно для добавления транзакции
  AllTransactions: { transactions: any[] };
  TransactionDetail: { transactionId: string };
  EditTransaction: { transactionId: string }; // Добавляем
  Categories: undefined; // Добавляем
  Reports: undefined; // Добавляем
};

// Helper типы для экранов
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<AuthStackParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

// Глобальный тип для навигации (для useNavigation)
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
