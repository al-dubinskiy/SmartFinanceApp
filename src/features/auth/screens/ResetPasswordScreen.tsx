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
          text1: 'Email Sent',
          text2: 'Check your inbox for password reset instructions',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed',
          text2: result.error,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An unexpected error occurred',
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
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Icon name="lock-reset" size={64} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text.primary }]}>
            Reset Password
          </Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            Enter your email address and we'll send you instructions to reset your password
          </Text>
        </View>

        {/* Form */}
        {!isSent ? (
          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email"
                  placeholder="Enter your email"
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
              title="Send Reset Instructions"
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
              Check Your Email
            </Text>
            <Text style={[styles.successText, { color: colors.text.secondary }]}>
              We've sent password reset instructions to your email address
            </Text>
            <Button
              title="Back to Login"
              onPress={() => navigation.navigate('Login')}
              style={styles.backToLoginButton}
            />
          </View>
        )}

        {/* Back to Login Link */}
        {!isSent && (
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              disabled={isLoading}
            >
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                Back to Sign In
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