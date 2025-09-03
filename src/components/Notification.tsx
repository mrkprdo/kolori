// Notification Component for React Native
// Migrated from kolori_old/src/components/Notification.jsx

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationState } from '../types';

interface NotificationProps {
  isVisible: boolean;
  type: NotificationState['type'];
  title: string;
  message: string;
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
  isDark: boolean;
}

export default function Notification({
  isVisible,
  type,
  title,
  message,
  onClose,
  autoClose = true,
  duration = 4000,
  isDark,
}: NotificationProps) {
  const slideAnim = React.useRef(new Animated.Value(-100)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      // Slide in and fade in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto close after duration
      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);
        return () => clearTimeout(timer);
      }
    }
  }, [isVisible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle',
          bgColor: isDark ? 'bg-green-900' : 'bg-green-100',
          borderColor: 'border-green-200',
          iconColor: '#10B981',
          titleColor: isDark ? 'text-green-200' : 'text-green-800',
          messageColor: isDark ? 'text-green-300' : 'text-green-700',
        };
      case 'error':
        return {
          icon: 'close-circle',
          bgColor: isDark ? 'bg-red-900' : 'bg-red-100',
          borderColor: 'border-red-200',
          iconColor: '#EF4444',
          titleColor: isDark ? 'text-red-200' : 'text-red-800',
          messageColor: isDark ? 'text-red-300' : 'text-red-700',
        };
      case 'warning':
        return {
          icon: 'warning',
          bgColor: isDark ? 'bg-yellow-900' : 'bg-yellow-100',
          borderColor: 'border-yellow-200',
          iconColor: '#F59E0B',
          titleColor: isDark ? 'text-yellow-200' : 'text-yellow-800',
          messageColor: isDark ? 'text-yellow-300' : 'text-yellow-700',
        };
      case 'info':
      default:
        return {
          icon: 'information-circle',
          bgColor: isDark ? 'bg-blue-900' : 'bg-blue-100',
          borderColor: 'border-blue-200',
          iconColor: '#3B82F6',
          titleColor: isDark ? 'text-blue-200' : 'text-blue-800',
          messageColor: isDark ? 'text-blue-300' : 'text-blue-700',
        };
    }
  };

  if (!isVisible) return null;

  const config = getTypeConfig();

  return (
    <Animated.View
      className={`absolute top-20 left-4 right-4 z-50`}
      style={{
        transform: [{ translateY: slideAnim }],
        opacity: opacityAnim,
      }}
    >
      <View
        className={`p-4 rounded-xl border shadow-lg ${config.bgColor} ${config.borderColor}`}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
        }}
      >
        <View className="flex-row items-start space-x-3">
          {/* Icon */}
          <View className="mt-0.5">
            <Ionicons 
              name={config.icon as any} 
              size={20} 
              color={config.iconColor} 
            />
          </View>

          {/* Content */}
          <View className="flex-1">
            <Text className={`font-semibold text-base mb-1 ${config.titleColor}`}>
              {title}
            </Text>
            <Text className={`text-sm leading-relaxed ${config.messageColor}`}>
              {message}
            </Text>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            onPress={handleClose}
            className="mt-0.5 p-1 rounded-full"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name="close" 
              size={16} 
              color={isDark ? '#9CA3AF' : '#6B7280'} 
            />
          </TouchableOpacity>
        </View>

        {/* Progress Bar for Auto Close */}
        {autoClose && (
          <View className={`mt-3 h-1 rounded-full ${
            isDark ? 'bg-gray-700' : 'bg-gray-200'
          }`}>
            <Animated.View
              className="h-full rounded-full"
              style={{
                backgroundColor: config.iconColor,
                width: opacityAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 300], // Use numeric values instead of percentages
                }),
                maxWidth: '100%',
              }}
            />
          </View>
        )}
      </View>
    </Animated.View>
  );
}