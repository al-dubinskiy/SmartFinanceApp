import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';

import { RootStackParamList } from './types';
import { AuthStack } from './AuthStack';
import { BottomTabNavigator } from './BottomTabNavigator';
import { PinCodeScreen } from '../features/auth/screens/PinCodeScreen';
import { SetupPinScreen } from '../features/profile/screens/SetupPinScreen';
import { useAppSelector } from '../store/hooks';
import { useTheme } from '../core/hooks/useTheme';
import pinService from '../core/services/pin.service';
import { AddTransactionScreen } from '../features/transactions/screens/AddTransactionScreen';
import { TransactionDetailScreen } from '../features/transactions/screens/TransactionDetailScreen';
import { EditTransactionScreen } from '../features/transactions/screens/EditTransactionScreen';
import { CategoriesScreen } from '../features/profile/screens/CategoriesScreen';
import { ReportsScreen } from '../features/analytics/screens/ReportsScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { isAuthenticated, isPinVerified } = useAppSelector(
    state => state.auth,
  );
  const { colors } = useTheme();

  const [hasPin, setHasPin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkPinStatus();
  }, [isAuthenticated]);

  const checkPinStatus = async () => {
    if (isAuthenticated) {
      const exists = await pinService.hasPin();
      setHasPin(exists);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={{ color: colors.text.primary }}>Loading...</Text>
      </View>
    );
  }

  // Логика:
  // 1. Если не авторизован -> Auth
  // 2. Если авторизован, есть PIN и не верифицирован -> PinCode
  // 3. Иначе -> Main
  const needsPinVerification = isAuthenticated && hasPin && !isPinVerified;

  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      {!isAuthenticated ? (
        <RootStack.Screen name="Auth" component={AuthStack} />
      ) : needsPinVerification ? (
        <RootStack.Screen name="PinCode" component={PinCodeScreen} />
      ) : (
        <RootStack.Screen name="Main" component={BottomTabNavigator} />
      )}

      <RootStack.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
        options={{
          headerShown: false,
        }}
      />

      <RootStack.Screen
        name="EditTransaction"
        component={EditTransactionScreen}
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />

      <RootStack.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ headerShown: false }}
      />

      {/* Модальные экраны */}
      <RootStack.Group screenOptions={{ presentation: 'modal' }}>
        <RootStack.Screen
          name="AddTransactionModal"
          component={AddTransactionScreen}
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
          }}
        />
        <RootStack.Screen
          name="SetupPin"
          component={SetupPinScreen}
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
          }}
        />
      </RootStack.Group>
    </RootStack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
