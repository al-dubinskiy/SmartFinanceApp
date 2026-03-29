import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../../core/hooks/useTheme';

interface ProgressBarProps {
  progress: number; // 0 to 100
  status: 'good' | 'warning' | 'exceeded';
  showLabel?: boolean;
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  status,
  showLabel = true,
  height = 8,
}) => {
  const { colors } = useTheme();
  const animatedProgress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: Math.min(progress, 100),
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const getStatusColor = () => {
    switch (status) {
      case 'good':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'exceeded':
        return colors.error;
      default:
        return colors.primary;
    }
  };

  const width = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={[styles.progressText, { color: colors.text.secondary }]}>
            Progress: {Math.min(progress, 100).toFixed(1)}%
          </Text>
        </View>
      )}
      <View
        style={[
          styles.track,
          {
            height,
            backgroundColor: colors.border,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              width,
              height,
              backgroundColor: getStatusColor(),
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    marginBottom: 4,
  },
  progressText: {
    fontSize: 12,
  },
  track: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 4,
  },
});