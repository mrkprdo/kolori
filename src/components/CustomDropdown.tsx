import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  StyleSheet,
  Dimensions,
  Platform,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DropdownItem {
  id: number | string;
  label: string;
  value: any;
}

interface CustomDropdownProps {
  data: DropdownItem[];
  selectedValue: any;
  onValueChange: (value: any) => void;
  placeholder?: string;
  isDark?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  containerStyle?: any;
  dropdownStyle?: any;
}

// Memoized dropdown item component for better performance
const DropdownItem = memo<{
  item: DropdownItem;
  isSelected: boolean;
  isDark: boolean;
  onPress: (item: DropdownItem) => void;
}>(({ item, isSelected, isDark, onPress }) => {
  const handlePress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);

  return (
    <TouchableOpacity
      style={[
        styles.dropdownItem,
        {
          backgroundColor: isSelected
            ? (isDark ? '#374151' : '#f3f4f6')
            : 'transparent',
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${item.label}${isSelected ? ', selected' : ''}`}
      accessibilityState={{ selected: isSelected }}
      accessibilityHint={`Select ${item.label}`}
    >
      <Text
        style={[
          styles.dropdownItemText,
          {
            color: isDark ? '#ffffff' : '#111827',
            fontWeight: isSelected ? '600' : '400',
          },
        ]}
        numberOfLines={1}
      >
        {item.label}
      </Text>
      {isSelected && (
        <Ionicons
          name="checkmark"
          size={20}
          color="#3b82f6"
        />
      )}
    </TouchableOpacity>
  );
});

const CustomDropdown: React.FC<CustomDropdownProps> = memo(({
  data,
  selectedValue,
  onValueChange,
  placeholder = 'Select an option...',
  isDark = false,
  disabled = false,
  searchable = true,
  containerStyle,
  dropdownStyle
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState(data);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-10)).current;
  
  const screenHeight = Dimensions.get('window').height;
  const isLargeList = data.length > 20;
  
  // Memoize filtered data calculation for better performance
  const memoizedFilteredData = useMemo(() => {
    if (searchText.trim() === '') {
      return data;
    } else {
      const searchLower = searchText.toLowerCase();
      return data.filter(item =>
        item.label.toLowerCase().includes(searchLower)
      );
    }
  }, [searchText, data]);
  
  // Use callback to prevent recreating functions on every render
  // Add debouncing for better performance with large lists
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleSearch = useCallback((text: string) => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // For small lists, update immediately
    if (data.length <= 50) {
      setSearchText(text);
      return;
    }
    
    // For large lists, debounce the search
    searchTimeoutRef.current = setTimeout(() => {
      setSearchText(text);
    }, 100); // 100ms debounce
  }, [data.length]);

  useEffect(() => {
    setFilteredData(memoizedFilteredData);
  }, [memoizedFilteredData]);
  
  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const openDropdown = useCallback(() => {
    if (disabled) return;
    setIsVisible(true);
    setSearchText('');
    
    // Reset animation values
    fadeAnim.setValue(0);
    slideAnim.setValue(-5); // Reduced distance for faster animation
    
    // Faster, simpler animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150, // Reduced duration
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150, // Simplified to timing for consistency
        useNativeDriver: true,
      }),
    ]).start();
  }, [disabled, fadeAnim, slideAnim]);

  const closeDropdown = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 100, // Even faster close
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -5,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
      setSearchText('');
    });
  }, [fadeAnim, slideAnim]);

  const selectItem = useCallback((item: DropdownItem) => {
    onValueChange(item.value);
    closeDropdown();
  }, [onValueChange]);
  
  // Keyboard navigation for better accessibility
  const handleKeyPress = useCallback((key: string, index: number) => {
    if (key === 'Enter' || key === ' ') {
      selectItem(filteredData[index]);
    }
  }, [filteredData, selectItem]);

  const getSelectedLabel = () => {
    const selectedItem = data.find(item => item.value === selectedValue);
    return selectedItem?.label || placeholder;
  };

  const isSelected = selectedValue !== null && selectedValue !== undefined;

  return (
    <>
      <TouchableOpacity
        style={[
          styles.dropdownButton,
          {
            backgroundColor: isDark ? '#374151' : '#f9fafb',
            borderColor: isDark ? '#4b5563' : '#d1d5db',
            opacity: disabled ? 0.6 : 1,
          },
          containerStyle,
        ]}
        onPress={openDropdown}
        disabled={disabled}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Dropdown: ${isSelected ? getSelectedLabel() : placeholder}`}
        accessibilityHint="Tap to open dropdown menu"
      >
        <Text
          style={[
            styles.dropdownButtonText,
            {
              color: isSelected 
                ? (isDark ? '#ffffff' : '#111827')
                : (isDark ? '#9ca3af' : '#6b7280'),
            },
          ]}
          numberOfLines={1}
        >
          {getSelectedLabel()}
        </Text>
        <Animated.View
          style={{
            transform: [{
              rotate: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '180deg'],
              }),
            }],
          }}
        >
          <Ionicons
            name="chevron-down"
            size={20}
            color={isDark ? '#9ca3af' : '#6b7280'}
          />
        </Animated.View>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="none"
        onRequestClose={closeDropdown}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeDropdown}
        >
          <Animated.View
            style={[
              styles.dropdownModal,
              {
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                borderColor: isDark ? '#374151' : '#e5e7eb',
                height: screenHeight * 0.6, // Force a specific height
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
              dropdownStyle,
            ]}
          >
            {/* Header */}
            <View style={[
              styles.modalHeader,
              { borderBottomColor: isDark ? '#374151' : '#e5e7eb' }
            ]}>
              <Text style={[
                styles.modalTitle,
                { color: isDark ? '#ffffff' : '#111827' }
              ]}>
                Select Option
              </Text>
              <TouchableOpacity
                onPress={closeDropdown}
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={isDark ? '#9ca3af' : '#6b7280'}
                />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            {searchable && isLargeList && (
              <View style={[
                styles.searchContainer,
                { borderBottomColor: isDark ? '#374151' : '#e5e7eb' }
              ]}>
                <Ionicons
                  name="search"
                  size={20}
                  color={isDark ? '#9ca3af' : '#6b7280'}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={[
                    styles.searchInput,
                    {
                      color: isDark ? '#ffffff' : '#111827',
                      backgroundColor: isDark ? '#374151' : '#f9fafb',
                    },
                  ]}
                  placeholder="Search..."
                  placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                  value={searchText}
                  onChangeText={handleSearch}
                  autoFocus={false}
                />
              </View>
            )}

            {/* Items List */}
            <FlatList
              data={filteredData}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              renderItem={({ item }) => (
                <DropdownItem
                  item={item}
                  isSelected={item.value === selectedValue}
                  isDark={isDark}
                  onPress={selectItem}
                />
              )}
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              initialNumToRender={15}
              windowSize={10}
              getItemLayout={(data, index) => ({
                length: Platform.OS === 'ios' ? 44 : 48,
                offset: (Platform.OS === 'ios' ? 44 : 48) * index,
                index,
              })}
              ListEmptyComponent={() => (
                <View style={styles.noResultsContainer}>
                  <Ionicons
                    name="search-outline"
                    size={32}
                    color={isDark ? '#6b7280' : '#9ca3af'}
                  />
                  <Text style={[
                    styles.noResultsText,
                    { color: isDark ? '#9ca3af' : '#6b7280' }
                  ]}>
                    No results found
                  </Text>
                </View>
              )}
            />
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 50,
    // Platform-specific shadow/elevation
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  dropdownButtonText: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
    // Better text rendering
    ...Platform.select({
      android: {
        includeFontPadding: false,
        textAlignVertical: 'center',
      },
    }),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dropdownModal: {
    width: '100%',
    maxWidth: 380,
    minWidth: 300,
    borderRadius: 16,
    borderWidth: Platform.OS === 'ios' ? 0 : 1,
    // Platform-specific shadow/elevation for modal
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    ...Platform.select({
      android: {
        includeFontPadding: false,
      },
    }),
  },
  closeButton: {
    padding: 4,
    borderRadius: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    // Platform-specific text input styling
    ...Platform.select({
      android: {
        includeFontPadding: false,
        textAlignVertical: 'center',
      },
    }),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    // Better touch feedback
    ...Platform.select({
      android: {
        minHeight: 48, // Android accessibility guideline
      },
      ios: {
        minHeight: 44, // iOS accessibility guideline
      },
    }),
  },
  dropdownItemText: {
    fontSize: 16,
    flex: 1,
    ...Platform.select({
      android: {
        includeFontPadding: false,
        textAlignVertical: 'center',
      },
    }),
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noResultsText: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    ...Platform.select({
      android: {
        includeFontPadding: false,
      },
    }),
  },
});

export default CustomDropdown;