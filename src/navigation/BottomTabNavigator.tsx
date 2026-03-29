import React from 'react';
import { View, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { HomeScreen } from '../features/home/screens/HomeScreen';
import { AnalyticsScreen } from '../features/analytics/screens/AnalyticsScreen';
import { PlanningScreen } from '../features/planning/screens/PlanningScreen';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import { MainTabParamList } from './types';
import { Colors } from '../core/constants/colors';

const Tab = createBottomTabNavigator<MainTabParamList>();

const CustomTabBarButton = ({ children, onPress }: any) => (
  <TouchableOpacity
    style={styles.fabButton}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={styles.fabContainer}>
      {children}
    </View>
  </TouchableOpacity>
);

export const BottomTabNavigator = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const colors = isDarkMode ? Colors.dark : Colors.light;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTitleStyle: {
          color: colors.text.primary,
        },
        headerShadowVisible: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" color={color} size={size} />
          ),
          title: 'Главная',
        }}
      />
      
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="chart-pie" color={color} size={size} />
          ),
          title: 'Аналитика',
        }}
      />
      
      <Tab.Screen
        name="AddTransaction"
        component={View} // Пустой компонент, так как это FAB
        options={{
          tabBarButton: (props) => (
            <CustomTabBarButton {...props}>
              <Icon name="plus" color="#FFFFFF" size={32} />
            </CustomTabBarButton>
          ),
          title: '', // Пустой заголовок для кнопки добавления
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            // По умолчанию открываем форму добавления расхода
            navigation.getParent()?.navigate('AddTransactionModal', {
              type: 'expense'
            });
          },
        })}
      />
      
      <Tab.Screen
        name="Planning"
        component={PlanningScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="target" color={color} size={size} />
          ),
          title: 'Планирование',
        }}
      />
      
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="account" color={color} size={size} />
          ),
          title: 'Профиль',
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  fabButton: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4E54C8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4E54C8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});