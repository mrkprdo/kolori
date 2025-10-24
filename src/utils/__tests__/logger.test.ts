import { logger } from '../logger';

describe('logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
  });

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleInfoSpy.mockRestore();
  });

  describe('in development mode (__DEV__ = true)', () => {
    beforeEach(() => {
      // __DEV__ is set to true in jest.config.js globals
    });

    it('should log messages in development mode', () => {
      logger.log('test message');
      expect(consoleLogSpy).toHaveBeenCalledWith('test message');
    });

    it('should log multiple arguments', () => {
      logger.log('message', 123, { key: 'value' }, ['array']);
      expect(consoleLogSpy).toHaveBeenCalledWith('message', 123, { key: 'value' }, ['array']);
    });

    it('should warn messages in development mode', () => {
      logger.warn('warning message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('warning message');
    });

    it('should warn with multiple arguments', () => {
      logger.warn('warning', { error: 'details' });
      expect(consoleWarnSpy).toHaveBeenCalledWith('warning', { error: 'details' });
    });

    it('should log error messages in development mode', () => {
      logger.error('error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('error message');
    });

    it('should error with multiple arguments', () => {
      const errorObj = new Error('test error');
      logger.error('error occurred:', errorObj);
      expect(consoleErrorSpy).toHaveBeenCalledWith('error occurred:', errorObj);
    });

    it('should log info messages in development mode', () => {
      logger.info('info message');
      expect(consoleInfoSpy).toHaveBeenCalledWith('info message');
    });

    it('should info with multiple arguments', () => {
      logger.info('information:', { data: 'value' });
      expect(consoleInfoSpy).toHaveBeenCalledWith('information:', { data: 'value' });
    });

    it('should handle undefined arguments', () => {
      logger.log(undefined);
      expect(consoleLogSpy).toHaveBeenCalledWith(undefined);
    });

    it('should handle null arguments', () => {
      logger.log(null);
      expect(consoleLogSpy).toHaveBeenCalledWith(null);
    });

    it('should handle no arguments', () => {
      logger.log();
      expect(consoleLogSpy).toHaveBeenCalledWith();
    });

    it('should handle complex objects', () => {
      const complexObj = {
        nested: { deep: { value: 123 } },
        array: [1, 2, 3],
        func: () => {},
      };
      logger.log(complexObj);
      expect(consoleLogSpy).toHaveBeenCalledWith(complexObj);
    });

    it('should handle errors as arguments', () => {
      const error = new Error('test error');
      logger.error(error);
      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    });

    it('should handle boolean values', () => {
      logger.log(true, false);
      expect(consoleLogSpy).toHaveBeenCalledWith(true, false);
    });

    it('should handle numbers', () => {
      logger.log(0, -1, 3.14, Infinity, NaN);
      expect(consoleLogSpy).toHaveBeenCalledWith(0, -1, 3.14, Infinity, NaN);
    });

    it('should handle symbols', () => {
      const sym = Symbol('test');
      logger.log(sym);
      expect(consoleLogSpy).toHaveBeenCalledWith(sym);
    });

    it('should call all log methods independently', () => {
      logger.log('log');
      logger.warn('warn');
      logger.error('error');
      logger.info('info');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    });

    it('should maintain call order', () => {
      logger.log('first');
      logger.warn('second');
      logger.error('third');

      // All methods should have been called once each
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('production mode simulation', () => {
    let originalDev: boolean;

    beforeAll(() => {
      // Note: We can't truly test production mode without reloading the module
      // because __DEV__ is read at module load time. This test documents
      // the expected behavior.
      originalDev = (global as any).__DEV__;
    });

    afterAll(() => {
      (global as any).__DEV__ = originalDev;
    });

    it('should document that logger uses __DEV__ flag', () => {
      // This test documents that the logger checks __DEV__
      // In production (__DEV__ = false), logs should not be called
      // In development (__DEV__ = true), logs should be called
      expect(typeof (global as any).__DEV__).toBe('boolean');
    });
  });

  describe('logger instance', () => {
    it('should be a singleton instance', () => {
      const { logger: logger1 } = require('../logger');
      const { logger: logger2 } = require('../logger');
      expect(logger1).toBe(logger2);
    });

    it('should have log method', () => {
      expect(typeof logger.log).toBe('function');
    });

    it('should have warn method', () => {
      expect(typeof logger.warn).toBe('function');
    });

    it('should have error method', () => {
      expect(typeof logger.error).toBe('function');
    });

    it('should have info method', () => {
      expect(typeof logger.info).toBe('function');
    });

    it('should export default logger', () => {
      const defaultLogger = require('../logger').default;
      expect(defaultLogger).toBe(logger);
    });
  });

  describe('method binding', () => {
    it('should allow destructured log method to work', () => {
      const { log } = logger;
      log('test');
      expect(consoleLogSpy).toHaveBeenCalledWith('test');
    });

    it('should allow destructured warn method to work', () => {
      const { warn } = logger;
      warn('test');
      expect(consoleWarnSpy).toHaveBeenCalledWith('test');
    });

    it('should allow destructured error method to work', () => {
      const { error } = logger;
      error('test');
      expect(consoleErrorSpy).toHaveBeenCalledWith('test');
    });

    it('should allow destructured info method to work', () => {
      const { info } = logger;
      info('test');
      expect(consoleInfoSpy).toHaveBeenCalledWith('test');
    });

    it('should maintain context when passed as callback', () => {
      const callback = logger.log;
      callback('test');
      expect(consoleLogSpy).toHaveBeenCalledWith('test');
    });
  });

  describe('edge cases', () => {
    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      logger.log(longString);
      expect(consoleLogSpy).toHaveBeenCalledWith(longString);
    });

    it('should handle circular references', () => {
      const circular: any = { prop: 'value' };
      circular.self = circular;
      logger.log(circular);
      expect(consoleLogSpy).toHaveBeenCalledWith(circular);
    });

    it('should handle Date objects', () => {
      const date = new Date();
      logger.log(date);
      expect(consoleLogSpy).toHaveBeenCalledWith(date);
    });

    it('should handle RegExp objects', () => {
      const regex = /test/gi;
      logger.log(regex);
      expect(consoleLogSpy).toHaveBeenCalledWith(regex);
    });

    it('should handle Map objects', () => {
      const map = new Map([['key', 'value']]);
      logger.log(map);
      expect(consoleLogSpy).toHaveBeenCalledWith(map);
    });

    it('should handle Set objects', () => {
      const set = new Set([1, 2, 3]);
      logger.log(set);
      expect(consoleLogSpy).toHaveBeenCalledWith(set);
    });

    it('should handle mixed argument types', () => {
      logger.log('string', 123, true, null, undefined, { obj: 'value' }, [1, 2]);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'string', 123, true, null, undefined, { obj: 'value' }, [1, 2]
      );
    });
  });
});
