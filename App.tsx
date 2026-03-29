import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, View, Text, ActivityIndicator } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import Toast from 'react-native-toast-message';

import { store, persistor } from './src/store/store';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useTheme } from './src/core/hooks/useTheme';
import firebaseService from './src/core/services/firebase.service';
import { useAppDispatch } from './src/store/hooks';
import { loginSuccess, logout } from './src/store/slices/authSlice';
import { database } from './src/database';
import { seedDefaultCategories } from './src/database/seed';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { seedTestData } from './src/database/seedData';

// Компонент для отслеживания состояния аутентификации
const AuthListener = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsubscribe = firebaseService.onAuthStateChanged((user) => {
      if (user) {
        dispatch(loginSuccess(user));
      } else {
        dispatch(logout());
      }
    });

    return unsubscribe;
  }, [dispatch]);

  return <>{children}</>;
};

// Компонент для инициализации базы данных
const DatabaseInitializer = ({ children }: { children: React.ReactNode }) => {
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState('Initializing database...');
  const { colors } = useTheme();

  useEffect(() => {
    const initDatabase = async () => {
      try {
        setStatus('Creating tables...');
        // База данных уже создана при импорте
        
        setStatus('Seeding test data...');
        await seedTestData();
        
        setStatus('Ready!');
        setIsReady(true);
      } catch (error) {
        console.error('Database initialization error:', error);
        setStatus('Error initializing database');
        // Все равно продолжаем, возможно данные уже есть
        setIsReady(true);
      }
    };

    initDatabase();
  }, []);

  if (!isReady) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: colors.background 
      }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text.primary, marginTop: 16 }}>
          {status}
        </Text>
      </View>
    );
  }

  return <>{children}</>;
};

// Основной компонент приложения
const AppContent = () => {
  const { colors, isDark } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <NavigationContainer>
        <AuthListener>
          <DatabaseInitializer>
            <RootNavigator />
          </DatabaseInitializer>
        </AuthListener>
      </NavigationContainer>
      <Toast />
    </GestureHandlerRootView>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;