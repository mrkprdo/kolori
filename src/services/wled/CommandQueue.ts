/**
 * Command Queue for WLED WebSocket
 *
 * Manages a FIFO queue with throttling to prevent overwhelming the device
 * Supports priority commands that skip to the front of the queue
 */

import { logger } from '../../utils/logger';

interface QueueItem {
  command: object;
  priority: 'normal' | 'urgent';
  timestamp: number;
}

export class CommandQueue {
  private queue: QueueItem[] = [];
  private processing: boolean = false;
  private throttleDelay: number = 50; // ms between commands
  private maxQueueSize: number = 100;
  private sendFn: (command: object) => boolean;

  constructor(sendFn: (command: object) => boolean) {
    this.sendFn = sendFn;
  }

  /**
   * Add command to queue
   */
  enqueue(command: object, priority: 'normal' | 'urgent' = 'normal'): void {
    // Drop old commands if queue is full
    if (this.queue.length >= this.maxQueueSize) {
      const dropped = this.queue.shift();
      logger.warn('Command queue full, dropped oldest command:', dropped?.command);
    }

    const item: QueueItem = {
      command,
      priority,
      timestamp: Date.now()
    };

    // Urgent commands go to front
    if (priority === 'urgent') {
      this.queue.unshift(item);
    } else {
      this.queue.push(item);
    }

    this.process();
  }

  /**
   * Process queue with throttling
   */
  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      const success = this.sendFn(item.command);

      if (!success) {
        logger.warn('Failed to send command, re-queueing:', item.command);
        this.queue.unshift(item); // Put back at front
        break;
      }

      // Throttle between commands
      if (this.queue.length > 0) {
        await this.sleep(this.throttleDelay);
      }
    }

    this.processing = false;

    // If more items added while processing, continue
    if (this.queue.length > 0) {
      this.process();
    }
  }

  /**
   * Get queue status
   */
  getStatus(): { length: number; processing: boolean } {
    return {
      length: this.queue.length,
      processing: this.processing
    };
  }

  /**
   * Clear all queued commands
   */
  clear(): void {
    this.queue = [];
    this.processing = false;
  }

  /**
   * Update throttle delay
   */
  setThrottleDelay(ms: number): void {
    this.throttleDelay = Math.max(10, Math.min(ms, 1000)); // 10ms - 1000ms
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
