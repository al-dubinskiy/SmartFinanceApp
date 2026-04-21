import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';

import { AuthStackScreenProps } from '../../../navigation/types';
import { Input } from '../../../ui/Input';
import { Button } from '../../../ui/Button';
import { useTheme } from '../../../core/hooks/useTheme';
import { useAppDispatch } from '../../../store/hooks';
import { loginSuccess, setLoading } from '../../../store/slices/authSlice';
import { registerSchema, RegisterFormData } from '../../../core/validations/auth.validation';
import firebaseService from '../../../core/services/firebase.service';

export const RegisterScreen: React.FC<AuthStackScreenProps<'Register'>> = ({
  navigation,
}) => {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      dispatch(setLoading(true));

      const result = await firebaseService.signUpWithEmail(
        { email: data.email, password: data.password },
        { displayName: data.name }
      );

      if (result.success && result.user) {
        dispatch(loginSuccess(result.user));
        Toast.show({
          type: 'success',
          text1: 'Аккаунт создан!',
          text2: 'Добро пожаловать в SmartFinance',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Ошибка регистрации',
          text2: result.error,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Произошла непредвиденная ошибка',
      });
    } finally {
      setIsLoading(false);
      dispatch(setLoading(false));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Кнопка назад */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        {/* Заголовок */}
        <View style={styles.header}>
          <Icon name="account-plus" size={64} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text.primary }]}>
            Создать аккаунт
          </Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            Начните управлять своими финансами сегодня
          </Text>
        </View>

        {/* Форма */}
        <View style={styles.form}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Полное имя"
                placeholder="Введите ваше полное имя"
                leftIcon="account"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
                editable={!isLoading}
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Электронная почта"
                placeholder="Введите ваш email"
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                editable={!isLoading}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Пароль"
                placeholder="Создайте пароль"
                secureTextEntry={!showPassword}
                leftIcon="lock"
                rightIcon={showPassword ? 'eye-off' : 'eye'}
                onRightIconPress={() => setShowPassword(!showPassword)}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                editable={!isLoading}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Подтверждение пароля"
                placeholder="Подтвердите ваш пароль"
                secureTextEntry={!showConfirmPassword}
                leftIcon="lock-check"
                rightIcon={showConfirmPassword ? 'eye-off' : 'eye'}
                onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirmPassword?.message}
                editable={!isLoading}
              />
            )}
          />

          {/* Требования к паролю */}
          <View style={[styles.requirements, { backgroundColor: colors.surface }]}>
            <Text style={[styles.requirementsTitle, { color: colors.text.secondary }]}>
              Пароль должен содержать:
            </Text>
            <View style={styles.requirementItem}>
              <Icon 
                name="check-circle" 
                size={16} 
                color={colors.success} 
              />
              <Text style={[styles.requirementText, { color: colors.text.secondary }]}>
                Не менее 6 символов
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Icon 
                name="check-circle" 
                size={16} 
                color={colors.success} 
              />
              <Text style={[styles.requirementText, { color: colors.text.secondary }]}>
                Как минимум одну заглавную букву
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Icon 
                name="check-circle" 
                size={16} 
                color={colors.success} 
              />
              <Text style={[styles.requirementText, { color: colors.text.secondary }]}>
                Как минимум одну цифру
              </Text>
            </View>
          </View>

          {/* Кнопка регистрации */}
          <Button
            title="Создать аккаунт"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading}
            style={styles.registerButton}
          />
        </View>

        {/* Ссылка на вход */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.text.secondary }]}>
            Уже есть аккаунт?{' '}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            disabled={isLoading}
          >
            <Text style={[styles.footerLink, { color: colors.primary }]}>
              Войти
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  requirements: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  requirementText: {
    fontSize: 13,
    marginLeft: 8,
  },
  registerButton: {
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 24,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});