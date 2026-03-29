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
          text1: 'Account Created!',
          text2: 'Welcome to SmartFinance',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Registration Failed',
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
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Icon name="account-plus" size={64} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text.primary }]}>
            Create Account
          </Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            Start managing your finances today
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Full Name"
                placeholder="Enter your full name"
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

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="Create a password"
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
                label="Confirm Password"
                placeholder="Confirm your password"
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

          {/* Password Requirements */}
          <View style={styles.requirements}>
            <Text style={[styles.requirementsTitle, { color: colors.text.secondary }]}>
              Password must contain:
            </Text>
            <View style={styles.requirementItem}>
              <Icon 
                name="check-circle" 
                size={16} 
                color={colors.success} 
              />
              <Text style={[styles.requirementText, { color: colors.text.secondary }]}>
                At least 6 characters
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Icon 
                name="check-circle" 
                size={16} 
                color={colors.success} 
              />
              <Text style={[styles.requirementText, { color: colors.text.secondary }]}>
                At least one uppercase letter
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Icon 
                name="check-circle" 
                size={16} 
                color={colors.success} 
              />
              <Text style={[styles.requirementText, { color: colors.text.secondary }]}>
                At least one number
              </Text>
            </View>
          </View>

          {/* Register Button */}
          <Button
            title="Create Account"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading}
            style={styles.registerButton}
          />
        </View>

        {/* Sign In Link */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.text.secondary }]}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            disabled={isLoading}
          >
            <Text style={[styles.footerLink, { color: colors.primary }]}>
              Sign In
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
    backgroundColor: 'rgba(0,0,0,0.03)',
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