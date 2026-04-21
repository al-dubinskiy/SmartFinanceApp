import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
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
import { loginSchema, LoginFormData } from '../../../core/validations/auth.validation';
import firebaseService from '../../../core/services/firebase.service';

export const LoginScreen: React.FC<AuthStackScreenProps<'Login'>> = ({
  navigation,
}) => {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      dispatch(setLoading(true));

      const result = await firebaseService.signInWithEmail(data);

      if (result.success && result.user) {
        dispatch(loginSuccess(result.user));
        Toast.show({
          type: 'success',
          text1: 'С возвращением!',
          text2: `Вы вошли как ${result.user.email}`,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Ошибка входа',
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

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      dispatch(setLoading(true));

      const result = await firebaseService.signInWithGoogle();

      console.log('Результат входа через Google', result);
      if (result.success && result.user) {
        dispatch(loginSuccess(result.user));
        Toast.show({
          type: 'success',
          text1: 'Добро пожаловать!',
          text2: `Вы вошли через Google`,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Ошибка входа через Google',
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
          <Icon name="finance" size={64} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text.primary }]}>
            С возвращением!
          </Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            Войдите, чтобы продолжить управлять своими финансами
          </Text>
        </View>

        {/* Форма */}
        <View style={styles.form}>
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
                placeholder="Введите ваш пароль"
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

          {/* Забыли пароль */}
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => navigation.navigate('ResetPassword')}
            disabled={isLoading}
          >
            <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
              Забыли пароль?
            </Text>
          </TouchableOpacity>

          {/* Кнопка входа */}
          <Button
            title="Войти"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading}
            style={styles.loginButton}
          />

          {/* Разделитель */}
          <View style={styles.dividerContainer}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.text.secondary }]}>
              ИЛИ
            </Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>

          {/* Социальный вход */}
          <Button
            title="Войти через Google"
            onPress={handleGoogleSignIn}
            variant="outline"
            leftIcon="google"
            disabled={isLoading}
            style={styles.googleButton}
          />
        </View>

        {/* Ссылка на регистрацию */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.text.secondary }]}>
            Нет аккаунта?{' '}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            disabled={isLoading}
          >
            <Text style={[styles.footerLink, { color: colors.primary }]}>
              Зарегистрироваться
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
    marginBottom: 40,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    marginBottom: 24,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  googleButton: {
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