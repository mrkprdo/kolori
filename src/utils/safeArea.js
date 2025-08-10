// Safe area utilities for mobile app

/**
 * Get safe area styles for consistent mobile layout
 * @param {Object} options - Configuration options
 * @param {boolean} options.top - Apply top safe area
 * @param {boolean} options.bottom - Apply bottom safe area
 * @param {boolean} options.left - Apply left safe area
 * @param {boolean} options.right - Apply right safe area
 * @param {string} options.additionalTop - Additional top padding (e.g., "1rem")
 * @param {string} options.additionalBottom - Additional bottom padding
 * @param {string} options.additionalLeft - Additional left padding
 * @param {string} options.additionalRight - Additional right padding
 * @returns {Object} CSS style object
 */
export const getSafeAreaStyles = (options = {}) => {
  const {
    top = false,
    bottom = false,
    left = false,
    right = false,
    additionalTop = '0px',
    additionalBottom = '0px',
    additionalLeft = '0px',
    additionalRight = '0px',
  } = options;

  const styles = {};

  if (top) {
    styles.paddingTop = additionalTop === '0px' 
      ? 'env(safe-area-inset-top)' 
      : `calc(env(safe-area-inset-top) + ${additionalTop})`;
  }

  if (bottom) {
    styles.paddingBottom = additionalBottom === '0px'
      ? 'env(safe-area-inset-bottom)'
      : `calc(env(safe-area-inset-bottom) + ${additionalBottom})`;
  }

  if (left) {
    styles.paddingLeft = additionalLeft === '0px'
      ? 'env(safe-area-inset-left)'
      : `calc(env(safe-area-inset-left) + ${additionalLeft})`;
  }

  if (right) {
    styles.paddingRight = additionalRight === '0px'
      ? 'env(safe-area-inset-right)'
      : `calc(env(safe-area-inset-right) + ${additionalRight})`;
  }

  return styles;
};

/**
 * Get position styles that respect safe areas
 * @param {string} position - Position type (top, bottom, left, right)
 * @param {string} offset - Additional offset (e.g., "1rem")
 * @returns {Object} CSS style object
 */
export const getSafeAreaPosition = (position, offset = '0px') => {
  const styles = {};

  switch (position) {
    case 'top':
      styles.top = offset === '0px'
        ? 'env(safe-area-inset-top)'
        : `calc(env(safe-area-inset-top) + ${offset})`;
      break;
    case 'bottom':
      styles.bottom = offset === '0px'
        ? 'env(safe-area-inset-bottom)'
        : `calc(env(safe-area-inset-bottom) + ${offset})`;
      break;
    case 'left':
      styles.left = offset === '0px'
        ? 'env(safe-area-inset-left)'
        : `calc(env(safe-area-inset-left) + ${offset})`;
      break;
    case 'right':
      styles.right = offset === '0px'
        ? 'env(safe-area-inset-right)'
        : `calc(env(safe-area-inset-right) + ${offset})`;
      break;
  }

  return styles;
};

/**
 * Check if we're running on a mobile platform
 * @returns {boolean}
 */
export const isMobile = () => {
  try {
    // Try to import Capacitor dynamically
    import('@capacitor/core').then(({ Capacitor }) => {
      return Capacitor.isNativePlatform();
    });
    // Fallback for immediate check
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  } catch {
    // Fallback for web
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
};

/**
 * Get safe area CSS class names for Tailwind
 * @param {Object} options - Configuration options  
 * @returns {string} CSS class names
 */
export const getSafeAreaClasses = (options = {}) => {
  const classes = [];
  
  if (options.top) classes.push('pt-safe-top');
  if (options.bottom) classes.push('pb-safe-bottom');
  if (options.left) classes.push('pl-safe-left');
  if (options.right) classes.push('pr-safe-right');
  
  return classes.join(' ');
};