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
import { resetPasswordSchema, ResetPasswordFormData } from '../../../core/validations/auth.validation';
import firebaseService from '../../../core/services/firebase.service';

export const ResetPasswordScreen: React.FC<AuthStackScreenProps<'ResetPassword'>> = ({
  navigation,
}) => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: yupResolver(resetPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setIsLoading(true);

      const result = await firebaseService.resetPassword(data.email);

      if (result.success) {
        setIsSent(true);
        Toast.show({
          type: 'success',
          text1: 'Письмо отправлено',
          text2: 'Проверьте вашу почту для получения инструкций по сбросу пароля',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Ошибка',
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
          <Icon name="lock-reset" size={64} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text.primary }]}>
            Сброс пароля
          </Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            Введите ваш email, и мы отправим инструкции для сброса пароля
          </Text>
        </View>

        {/* Форма */}
        {!isSent ? (
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

            <Button
              title="Отправить инструкции"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              disabled={isLoading}
              style={styles.resetButton}
            />
          </View>
        ) : (
          <View style={styles.successContainer}>
            <Icon name="email-check" size={80} color={colors.success} />
            <Text style={[styles.successTitle, { color: colors.text.primary }]}>
              Проверьте вашу почту
            </Text>
            <Text style={[styles.successText, { color: colors.text.secondary }]}>
              Мы отправили инструкции по сбросу пароля на ваш email
            </Text>
            <Button
              title="Вернуться к входу"
              onPress={() => navigation.navigate('Login')}
              style={styles.backToLoginButton}
            />
          </View>
        )}

        {/* Ссылка для возврата к входу */}
        {!isSent && (
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              disabled={isLoading}
            >
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                Вернуться ко входу
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
  },
  resetButton: {
    marginTop: 24,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  backToLoginButton: {
    minWidth: 200,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 24,
  },
  footerLink: {
    fontSize: 16,
    fontWeight: '600',
  },
});