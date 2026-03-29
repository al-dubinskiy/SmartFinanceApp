import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthStackScreenProps } from '../../../navigation/types';
import { useTheme } from '../../../core/hooks/useTheme';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { setPinVerified } from '../../../store/slices/authSlice';
import pinService from '../../../core/services/pin.service';

const { width } = Dimensions.get('window');
const PIN_LENGTH = 6;

export const PinCodeScreen: React.FC<AuthStackScreenProps<'PinCode'>> = ({
  navigation,
}) => {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  
  const [pin, setPin] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleNumberPress = (number: string) => {
    if (pin.length < PIN_LENGTH) {
      const newPin = [...pin, number];
      setPin(newPin);
      
      if (newPin.length === PIN_LENGTH) {
        validatePin(newPin.join(''));
      }
    }
  };

  const handleDeletePress = () => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const handleClearPress = () => {
    setPin([]);
    setError(null);
  };

  const validatePin = async (enteredPin: string) => {
    const result = await pinService.validatePin(enteredPin);
    
    if (result.success) {
      dispatch(setPinVerified(true));
    } else {
      setError('Invalid PIN. Please try again.');
      setPin([]);
    }
  };

  const renderPinDots = () => {
    return (
      <View style={styles.pinContainer}>
        {Array(PIN_LENGTH)
          .fill(0)
          .map((_, index) => (
            <View
              key={index}
              style={[
                styles.pinDot,
                {
                  backgroundColor: index < pin.length 
                    ? colors.primary 
                    : 'transparent',
                  borderColor: index < pin.length 
                    ? colors.primary 
                    : colors.border,
                },
              ]}
            />
          ))}
      </View>
    );
  };

  const renderKeypad = () => {
    const keys = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['clear', '0', 'delete'],
    ];

    return (
      <View style={styles.keypad}>
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key, colIndex) => {
              if (key === 'clear') {
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.keypadKey}
                    onPress={handleClearPress}
                    disabled={pin.length === 0}
                  >
                    <Text style={[styles.keypadText, { color: colors.text.secondary }]}>
                      Clear
                    </Text>
                  </TouchableOpacity>
                );
              }
              
              if (key === 'delete') {
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.keypadKey}
                    onPress={handleDeletePress}
                    disabled={pin.length === 0}
                  >
                    <Icon 
                      name="backspace-outline" 
                      size={24} 
                      color={colors.text.secondary} 
                    />
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={key}
                  style={styles.keypadKey}
                  onPress={() => handleNumberPress(key)}
                >
                  <Text style={[styles.keypadText, { color: colors.text.primary }]}>
                    {key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Icon name="lock" size={48} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Enter PIN Code
        </Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          Enter your {PIN_LENGTH}-digit PIN to continue
        </Text>
      </View>

      {/* PIN Dots */}
      {renderPinDots()}

      {/* Error Message */}
      {error && (
        <Text style={[styles.error, { color: colors.error }]}>
          {error}
        </Text>
      )}

      {/* Keypad */}
      {renderKeypad()}

      {/* Forgot PIN */}
      <TouchableOpacity
        style={styles.forgotButton}
        onPress={() => {
          Alert.alert(
            'Forgot PIN',
            'To reset your PIN, you need to log out and set a new one.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Log Out', 
                onPress: () => {
                  // Выход будет обработан в RootNavigator
                  dispatch(setPinVerified(false));
                },
                style: 'destructive',
              },
            ]
          );
        }}
      >
        <Text style={[styles.forgotText, { color: colors.text.secondary }]}>
          Forgot PIN?
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 30,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginHorizontal: 8,
  },
  error: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  keypad: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 30,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 8,
  },
  keypadKey: {
    width: width / 4 - 20,
    height: width / 4 - 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: (width / 4 - 20) / 2,
  },
  keypadText: {
    fontSize: 24,
    fontWeight: '400',
  },
  forgotButton: {
    padding: 20,
    alignItems: 'center',
  },
  forgotText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});