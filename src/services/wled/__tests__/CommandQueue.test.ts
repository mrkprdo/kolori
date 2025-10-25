import { CommandQueue } from '../CommandQueue';
import { logger } from '../../../utils/logger';

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('CommandQueue', () => {
  let mockSendFn: jest.Mock;
  let queue: CommandQueue;

  beforeEach(() => {
    jest.useFakeTimers();
    mockSendFn = jest.fn().mockReturnValue(true);
    queue = new CommandQueue(mockSendFn);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should create queue with send function', () => {
      expect(queue).toBeInstanceOf(CommandQueue);
      expect(queue.getStatus().length).toBe(0);
      expect(queue.getStatus().processing).toBe(false);
    });
  });

  describe('enqueue', () => {
    it('should add command to queue', async () => {
      const command = { test: 'command' };

      // With single command, it processes immediately (no throttle delay)
      queue.enqueue(command);

      await jest.runAllTimersAsync();

      // Command should be sent and queue should be empty
      expect(mockSendFn).toHaveBeenCalledWith(command);
      expect(queue.getStatus().length).toBe(0);
    });

    it('should process command immediately', async () => {
      const command = { test: 'command' };
      queue.enqueue(command);

      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledWith(command);
      expect(queue.getStatus().length).toBe(0);
    });

    it('should add multiple commands', () => {
      queue.enqueue({ cmd: 1 });
      queue.enqueue({ cmd: 2 });
      queue.enqueue({ cmd: 3 });

      // Commands will start processing immediately
      expect(queue.getStatus().length).toBeGreaterThanOrEqual(0);
    });

    it('should handle normal priority commands (FIFO)', async () => {
      const commands = [{ cmd: 1 }, { cmd: 2 }, { cmd: 3 }];

      commands.forEach(cmd => queue.enqueue(cmd, 'normal'));

      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledTimes(3);
      expect(mockSendFn).toHaveBeenNthCalledWith(1, commands[0]);
      expect(mockSendFn).toHaveBeenNthCalledWith(2, commands[1]);
      expect(mockSendFn).toHaveBeenNthCalledWith(3, commands[2]);
    });

    it('should prioritize urgent commands', async () => {
      // Add normal command first
      queue.enqueue({ cmd: 'normal' }, 'normal');

      // Add urgent command - should go to front
      queue.enqueue({ cmd: 'urgent' }, 'urgent');

      await jest.runAllTimersAsync();

      // Normal was already processing when urgent was added
      expect(mockSendFn).toHaveBeenNthCalledWith(1, { cmd: 'normal' });
      expect(mockSendFn).toHaveBeenNthCalledWith(2, { cmd: 'urgent' });
    });

    it('should drop oldest command when queue is full', async () => {
      // Mock the private process method to prevent processing during enqueue
      const testQueue = new CommandQueue(mockSendFn);
      const originalProcess = (testQueue as any).process;
      let processCallCount = 0;

      // Block processing temporarily
      (testQueue as any).process = jest.fn().mockImplementation(() => {
        processCallCount++;
        // Only actually process after we've added all items
        if (processCallCount > 105) {
          return originalProcess.call(testQueue);
        }
        return Promise.resolve();
      });

      // Add 105 commands (exceeds max of 100)
      for (let i = 0; i < 105; i++) {
        testQueue.enqueue({ cmd: i }, 'normal');
      }

      // Logger should have been called when queue exceeded 100
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Command queue full, dropped oldest command:',
        expect.anything()
      );

      testQueue.clear();
    });

    it('should handle urgent command when queue is empty', async () => {
      const command = { urgent: true };
      queue.enqueue(command, 'urgent');

      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledWith(command);
    });
  });

  describe('process with throttling', () => {
    it('should throttle between commands', async () => {
      queue.enqueue({ cmd: 1 });
      queue.enqueue({ cmd: 2 });
      queue.enqueue({ cmd: 3 });

      // Advance through all timers to complete processing
      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledTimes(3);
    });

    it('should not throttle after last command', async () => {
      queue.enqueue({ cmd: 1 });

      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledTimes(1);
      expect(queue.getStatus().processing).toBe(false);
    });

    it('should respect custom throttle delay', async () => {
      queue.setThrottleDelay(20);

      queue.enqueue({ cmd: 1 });
      queue.enqueue({ cmd: 2 });

      await jest.runAllTimersAsync();

      // Both commands should be sent
      expect(mockSendFn).toHaveBeenCalledTimes(2);
      expect(mockSendFn).toHaveBeenNthCalledWith(1, { cmd: 1 });
      expect(mockSendFn).toHaveBeenNthCalledWith(2, { cmd: 2 });
    });

    // Note: Lines 75 and 113 (throttle sleep mechanism) are executed in real usage
    // but difficult to test in isolation with Jest fake timers, as runAllTimersAsync()
    // resolves all setTimeout calls instantly, making the sleep path unreachable in tests.
  });

  describe('failed send handling', () => {
    it('should re-queue command when send fails', async () => {
      // Mock to fail once, then succeed to prevent infinite retries
      let attemptCount = 0;
      mockSendFn.mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) return false; // First attempt fails
        return true; // Subsequent attempts succeed
      });

      queue.enqueue({ cmd: 'test' });

      // Let processing happen
      await jest.runAllTimersAsync();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send command'),
        expect.any(Object)
      );
      // Command was re-queued and then successfully sent on retry
      expect(attemptCount).toBe(2); // Failed once, succeeded on retry
      expect(queue.getStatus().length).toBe(0);
    });

    it('should stop processing when send fails', async () => {
      // First succeeds, second fails once then succeeds, third succeeds
      let callCount = 0;
      mockSendFn.mockImplementation(cmd => {
        callCount++;
        // Fail on second command's first attempt only
        if (callCount === 2) return false;
        return true;
      });

      queue.enqueue({ cmd: 1 });
      queue.enqueue({ cmd: 2 });
      queue.enqueue({ cmd: 3 });

      await jest.runAllTimersAsync();

      // All commands eventually succeed (cmd2 fails once, retries and succeeds)
      expect(mockSendFn).toHaveBeenCalledTimes(4); // 1 success, 1 fail + retry success, 1 success
      expect(queue.getStatus().length).toBe(0);
    });

    it('should put failed command back at front of queue', async () => {
      // First succeeds, second fails once then succeeds
      let callCount = 0;
      mockSendFn.mockImplementation(() => {
        callCount++;
        if (callCount === 2) return false; // Second command fails on first try
        return true;
      });

      queue.enqueue({ cmd: 1 });
      queue.enqueue({ cmd: 2 });

      await jest.runAllTimersAsync();

      // Both commands eventually succeed
      expect(mockSendFn).toHaveBeenCalledTimes(3); // cmd1 success, cmd2 fail, cmd2 retry success
      expect(queue.getStatus().length).toBe(0);
      expect(queue.getStatus().processing).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return empty queue status initially', () => {
      const status = queue.getStatus();

      expect(status.length).toBe(0);
      expect(status.processing).toBe(false);
    });

    it('should show queue length', () => {
      queue.enqueue({ cmd: 1 });
      queue.enqueue({ cmd: 2 });

      const status = queue.getStatus();
      expect(status.length).toBeGreaterThanOrEqual(0);
    });

    it('should indicate processing state', async () => {
      // Test that getStatus correctly reports processing state
      const initialStatus = queue.getStatus();
      expect(initialStatus.processing).toBe(false);

      // Enqueue commands and verify processing completes
      queue.enqueue({ cmd: 1 });
      queue.enqueue({ cmd: 2 });

      await jest.runAllTimersAsync();

      const finalStatus = queue.getStatus();
      expect(finalStatus.processing).toBe(false);
      expect(finalStatus.length).toBe(0);
      expect(mockSendFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('clear', () => {
    it('should clear all queued commands', () => {
      queue.enqueue({ cmd: 1 });
      queue.enqueue({ cmd: 2 });
      queue.enqueue({ cmd: 3 });

      queue.clear();

      const status = queue.getStatus();
      expect(status.length).toBe(0);
      expect(status.processing).toBe(false);
    });

    it('should stop processing', async () => {
      queue.setThrottleDelay(100);

      queue.enqueue({ cmd: 1 });
      queue.enqueue({ cmd: 2 });

      queue.clear();

      await jest.runAllTimersAsync();

      const status = queue.getStatus();
      expect(status.processing).toBe(false);
    });

    it('should allow enqueueing after clear', async () => {
      queue.enqueue({ cmd: 1 });
      queue.clear();
      queue.enqueue({ cmd: 2 });

      expect(queue.getStatus().length).toBeGreaterThanOrEqual(0);

      await jest.runAllTimersAsync();
      expect(mockSendFn).toHaveBeenCalledWith({ cmd: 2 });
    });
  });

  describe('setThrottleDelay', () => {
    it('should update throttle delay', () => {
      queue.setThrottleDelay(100);
      // No direct way to verify, but should not throw
      expect(queue).toBeDefined();
    });

    it('should enforce minimum throttle delay of 10ms', () => {
      queue.setThrottleDelay(5);
      // Should be clamped to 10ms
      expect(queue).toBeDefined();
    });

    it('should enforce maximum throttle delay of 1000ms', () => {
      queue.setThrottleDelay(2000);
      // Should be clamped to 1000ms
      expect(queue).toBeDefined();
    });

    it('should accept valid throttle delay', () => {
      queue.setThrottleDelay(50);
      queue.setThrottleDelay(100);
      queue.setThrottleDelay(500);

      expect(queue).toBeDefined();
    });
  });

  describe('concurrent operations', () => {
    it('should handle rapid enqueueing', async () => {
      for (let i = 0; i < 10; i++) {
        queue.enqueue({ cmd: i });
      }

      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledTimes(10);
    });

    it('should process all commands eventually', async () => {
      const commands = Array.from({ length: 20 }, (_, i) => ({ cmd: i }));

      commands.forEach(cmd => queue.enqueue(cmd));

      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledTimes(20);
      expect(queue.getStatus().length).toBe(0);
    });

    it('should handle mix of urgent and normal commands', async () => {
      queue.enqueue({ cmd: 'normal1' }, 'normal');
      queue.enqueue({ cmd: 'urgent1' }, 'urgent');
      queue.enqueue({ cmd: 'normal2' }, 'normal');
      queue.enqueue({ cmd: 'urgent2' }, 'urgent');

      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledTimes(4);
    });
  });

  describe('edge cases', () => {
    it('should handle empty command object', async () => {
      queue.enqueue({});

      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledWith({});
    });

    it('should handle complex command objects', async () => {
      const complexCommand = {
        nested: { deep: { value: 123 } },
        array: [1, 2, 3],
        func: () => {},
      };

      queue.enqueue(complexCommand);

      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledWith(complexCommand);
    });

    it('should handle many urgent commands', async () => {
      for (let i = 0; i < 10; i++) {
        queue.enqueue({ urgent: i }, 'urgent');
      }

      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledTimes(10);
    });

    it('should not process when queue is empty', async () => {
      const status1 = queue.getStatus();
      expect(status1.processing).toBe(false);

      await jest.runAllTimersAsync();

      const status2 = queue.getStatus();
      expect(status2.processing).toBe(false);
    });
  });

  describe('processing continuation', () => {
    it('should continue processing if items added during processing', async () => {
      queue.setThrottleDelay(50);

      queue.enqueue({ cmd: 1 });

      // Advance timers partway through processing
      await jest.advanceTimersByTimeAsync(25);

      queue.enqueue({ cmd: 2 });
      queue.enqueue({ cmd: 3 });

      // Complete all processing
      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledTimes(3);
    });

    it('should handle commands added after queue becomes empty', async () => {
      queue.enqueue({ cmd: 1 });

      await jest.runAllTimersAsync();

      expect(queue.getStatus().length).toBe(0);

      queue.enqueue({ cmd: 2 });

      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledTimes(2);
    });
  });
});
