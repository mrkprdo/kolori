// Mixed Content Testing Utilities
import { logger } from './logger.js';

/**
 * Test if mixed content is properly bypassed
 * @param {string} httpUrl - HTTP URL to test
 * @returns {Promise<{success: boolean, message: string, platform: string}>}
 */
export const testMixedContentBypass = async (httpUrl) => {
  const platform = window.Capacitor?.getPlatform() || 'web';
  const isHTTPS = window.location.protocol === 'https:';
  
  logger.log('🧪 Testing mixed content bypass:', { httpUrl, platform, isHTTPS });
  
  try {
    const startTime = Date.now();
    const response = await fetch(httpUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      logger.log('✅ Mixed content bypass successful:', responseTime + 'ms');
      return {
        success: true,
        message: `Mixed content bypass working! Response in ${responseTime}ms`,
        platform,
        responseTime,
        isHTTPS,
        httpUrl
      };
    } else {
      logger.log('⚠️ HTTP request failed:', response.status);
      return {
        success: false,
        message: `HTTP request failed: ${response.status}`,
        platform,
        isHTTPS,
        httpUrl
      };
    }
  } catch (error) {
    logger.error('❌ Mixed content test failed:', error.message);
    
    // Analyze the error type
    let errorType = 'unknown';
    if (error.message.includes('mixed content') || 
        error.message.includes('Mixed Content')) {
      errorType = 'mixed_content_blocked';
    } else if (error.message.includes('Failed to fetch')) {
      errorType = 'network_error';
    } else if (error.name === 'TimeoutError') {
      errorType = 'timeout';
    }
    
    return {
      success: false,
      message: `Mixed content test failed: ${error.message}`,
      platform,
      isHTTPS,
      httpUrl,
      errorType,
      error: error.message
    };
  }
};

/**
 * Run comprehensive mixed content tests
 * @param {Array<string>} testUrls - Array of HTTP URLs to test
 * @returns {Promise<{results: Array, summary: Object}>}
 */
export const runMixedContentTests = async (testUrls = []) => {
  const defaultTests = [
    'http://httpbin.org/get',
    'http://192.168.1.1', // Common router IP
    'http://localhost:8080'
  ];
  
  const urlsToTest = testUrls.length > 0 ? testUrls : defaultTests;
  const results = [];
  
  logger.log('🧪 Running comprehensive mixed content tests...');
  
  for (const url of urlsToTest) {
    const result = await testMixedContentBypass(url);
    results.push(result);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const successCount = results.filter(r => r.success).length;
  const summary = {
    total: results.length,
    successful: successCount,
    failed: results.length - successCount,
    platform: results[0]?.platform || 'unknown',
    isHTTPS: results[0]?.isHTTPS || false,
    bypassWorking: successCount > 0
  };
  
  logger.log('📊 Mixed content test summary:', summary);
  
  return { results, summary };
};

/**
 * Get platform-specific mixed content information
 * @returns {Object} Platform info and mixed content support
 */
export const getMixedContentInfo = () => {
  const platform = window.Capacitor?.getPlatform() || 'web';
  const isHTTPS = window.location.protocol === 'https:';
  const isCapacitor = !!window.Capacitor;
  
  const info = {
    platform,
    isHTTPS,
    isCapacitor,
    userAgent: navigator.userAgent,
    location: window.location.href,
    mixedContentSupport: {
      web: 'Depends on iframe and CSP headers',
      android: 'Supported via network security config + Capacitor settings',
      ios: 'Supported via App Transport Security exceptions + Capacitor settings'
    }[platform] || 'Unknown platform'
  };
  
  logger.log('ℹ️ Mixed content platform info:', info);
  return info;
};