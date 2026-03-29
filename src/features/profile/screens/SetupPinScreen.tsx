import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../core/hooks/useTheme';
import { useAppSelector } from '../../../store/hooks';
import pinService from '../../../core/services/pin.service';
import { RootStackScreenProps } from '../../../navigation/types';

const { width } = Dimensions.get('window');
const PIN_LENGTH = 6;

export const SetupPinScreen: React.FC<RootStackScreenProps<'SetupPin'>> = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAppSelector((state) => state.auth);
  
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [pin, setPin] = useState<string[]>([]);
  const [confirmPin, setConfirmPin] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleNumberPress = (number: string) => {
    if (step === 'create') {
      if (pin.length < PIN_LENGTH) {
        const newPin = [...pin, number];
        setPin(newPin);
        
        if (newPin.length === PIN_LENGTH) {
          // Переходим к подтверждению
          setStep('confirm');
        }
      }
    } else {
      if (confirmPin.length < PIN_LENGTH) {
        const newConfirmPin = [...confirmPin, number];
        setConfirmPin(newConfirmPin);
        
        if (newConfirmPin.length === PIN_LENGTH) {
          validateAndSave(newConfirmPin.join(''));
        }
      }
    }
  };

  const handleDeletePress = () => {
    if (step === 'create') {
      setPin(prev => prev.slice(0, -1));
    } else {
      setConfirmPin(prev => prev.slice(0, -1));
    }
    setError(null);
  };

  const handleClearPress = () => {
    if (step === 'create') {
      setPin([]);
    } else {
      setConfirmPin([]);
    }
    setError(null);
  };

  const handleBackPress = () => {
    if (step === 'confirm') {
      // Возвращаемся к созданию PIN
      setStep('create');
      setConfirmPin([]);
      setError(null);
    } else {
      navigation.goBack();
    }
  };

  const validateAndSave = async (confirmedPin: string) => {
    const enteredPin = pin.join('');
    
    if (enteredPin === confirmedPin) {
      const result = await pinService.savePin(enteredPin, user?.email || '');
      
      if (result.success) {
        Alert.alert(
          'Success',
          'PIN code has been set successfully.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        setError(result.error || 'Failed to save PIN');
        resetToCreate();
      }
    } else {
      setError('PINs do not match. Please try again.');
      resetToCreate();
    }
  };

  const resetToCreate = () => {
    setStep('create');
    setPin([]);
    setConfirmPin([]);
  };

  const renderPinDots = (currentPin: string[]) => {
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
                  backgroundColor: index < currentPin.length 
                    ? colors.primary 
                    : 'transparent',
                  borderColor: index < currentPin.length 
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
                  >
                    <Text style={[styles.keypadText, { color: colors.text.secondary }]}>
                      Clear
                    </Text>
                  </TouchableOpacity>
                );
              }
              
              if (key === 'delete') {
                const currentPin = step === 'create' ? pin : confirmPin;
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.keypadKey}
                    onPress={handleDeletePress}
                    disabled={currentPin.length === 0}
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Icon name="arrow-left" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        
        <Icon 
          name={step === 'create' ? 'pin' : 'pin-outline'} 
          size={48} 
          color={colors.primary} 
        />
        <Text style={[styles.title, { color: colors.text.primary }]}>
          {step === 'create' ? 'Create PIN Code' : 'Confirm PIN Code'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          {step === 'create'
            ? `Enter a ${PIN_LENGTH}-digit PIN to secure your app`
            : 'Enter the same PIN again to confirm'}
        </Text>
      </View>

      {/* PIN Dots */}
      {step === 'create' 
        ? renderPinDots(pin)
        : renderPinDots(confirmPin)
      }

      {/* Error Message */}
      {error && (
        <Text style={[styles.error, { color: colors.error }]}>
          {error}
        </Text>
      )}

      {/* Keypad */}
      {renderKeypad()}

      {/* Skip Option */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => {
          Alert.alert(
            'Skip PIN Setup',
            'Are you sure? Without a PIN, your data will be less secure.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Skip', onPress: () => navigation.goBack() },
            ]
          );
        }}
      >
        <Text style={[styles.skipText, { color: colors.text.secondary }]}>
          Skip for now
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
    paddingTop: 40,
    paddingBottom: 30,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    padding: 8,
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
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
    color: '#E74C3C',
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
  skipButton: {
    padding: 16,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});