/**
 * WLED WebSocket Service (Singleton)
 *
 * Manages a single WebSocket connection per device with:
 * - Command queue with throttling
 * - Event-driven message routing
 * - Auto-reconnect with exponential backoff
 * - Connection state management
 */

import { CommandQueue } from './CommandQueue';
import { MessageParser, LEDColor } from './MessageParser';
import { logger } from '../../utils/logger';

type EventHandler = (...args: any[]) => void;

export interface DeviceState {
  on: boolean;
  brightness: number;
  activePreset: number | null;
  [key: string]: any;
}

export class WledWebSocketService {
  private ws: WebSocket | null = null;
  private commandQueue: CommandQueue;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();

  // Connection state
  private currentIp: string | null = null;
  private currentProtocol: 'ws' | 'wss' = 'ws';
  private isManualDisconnect: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  // State cache
  private currentState: DeviceState = {
    on: false,
    brightness: 128,
    activePreset: null
  };
  private liveLedData: LEDColor[] = [];

  constructor() {
    this.commandQueue = new CommandQueue((cmd) => this.sendRaw(cmd));
  }

  /**
   * Connect to WLED device
   */
  async connect(ip: string, protocol: 'ws' | 'wss' = 'ws'): Promise<void> {
    logger.log(`🔌 Connecting to ${protocol}://${ip}/ws`);

    // Disconnect existing connection first
    if (this.ws) {
      this.disconnect();
      await this.sleep(100);
    }

    this.currentIp = ip;
    this.currentProtocol = protocol;
    this.isManualDisconnect = false;
    this.reconnectAttempts = 0;

    const wsUrl = `${protocol}://${ip}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => this.handleOpen();
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onclose = (event) => this.handleClose(event);
      this.ws.onerror = (error) => this.handleError(error);
    } catch (error) {
      logger.error('Failed to create WebSocket:', error);
      this.emit('error', error);
    }
  }

  /**
   * Disconnect from device
   */
  disconnect(): void {
    logger.log('🔌 Disconnecting WebSocket');

    this.isManualDisconnect = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;

      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Manual disconnect');
      }

      this.ws = null;
    }

    this.commandQueue.clear();
    this.currentIp = null;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Send command (queued)
   */
  sendCommand(command: object, priority: 'normal' | 'urgent' = 'normal'): void {
    this.commandQueue.enqueue(command, priority);
  }

  /**
   * Get current state
   */
  getCurrentState(): DeviceState {
    return { ...this.currentState };
  }

  /**
   * Get live LED data
   */
  getLiveLedData(): LEDColor[] {
    return [...this.liveLedData];
  }

  /**
   * Event emitter - subscribe to events
   */
  on(event: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Event emitter - unsubscribe from events
   */
  off(event: string, handler: EventHandler): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  /**
   * Emit event to all subscribers
   */
  private emit(event: string, ...args: any[]): void {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler(...args);
      } catch (error) {
        logger.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Send raw command (internal use by queue)
   */
  private sendRaw(command: object): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('⚠️ Cannot send command - WebSocket not connected. State:', this.ws?.readyState);
      return false;
    }

    try {
      const cmdStr = JSON.stringify(command);
      logger.log('📤 Sending WebSocket command:', cmdStr);
      this.ws.send(cmdStr);
      return true;
    } catch (error) {
      logger.error('Failed to send command:', error);
      return false;
    }
  }

  /**
   * Handle WebSocket open
   */
  private handleOpen(): void {
    logger.log('✅ WebSocket connected');
    this.reconnectAttempts = 0;
    this.emit('connected', true);

    // Request initial state and info
    this.sendCommand({ info: {} }, 'urgent');
    this.sendCommand({ state: {} }, 'urgent');
  }

  /**
   * Handle WebSocket message
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    try {
      const parsed = await MessageParser.parse(event.data);

      switch (parsed.type) {
        case 'leds':
          this.liveLedData = parsed.data;
          this.emit('leds', parsed.data, parsed.matrixDimensions);
          break;

        case 'state':
          // Normalize WLED state property names
          const normalizedState = {
            ...parsed.data,
            brightness: parsed.data.bri !== undefined ? parsed.data.bri : parsed.data.brightness,
            activePreset: parsed.data.ps !== undefined ? parsed.data.ps : parsed.data.activePreset
          };
          this.currentState = { ...this.currentState, ...normalizedState };
          logger.log('📊 State updated:', this.currentState);
          this.emit('state', this.currentState);
          break;

        case 'info':
          this.emit('info', parsed.data);
          break;

        default:
          this.emit('message', parsed.data);
      }
    } catch (error) {
      logger.error('Error handling WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(event: CloseEvent): void {
    logger.log('❌ WebSocket closed');
    this.emit('connected', false);

    // Auto-reconnect if not manual disconnect
    if (!this.isManualDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnect();
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(error: Event): void {
    const errorMessage = (error as any)?.message || '';

    // Ignore non-critical masking errors
    if (errorMessage.includes('Server-sent frames must not be masked')) {
      return;
    }

    logger.error('WebSocket error:', error);
    this.emit('error', error);
  }

  /**
   * Reconnect with exponential backoff
   */
  private reconnect(): void {
    if (!this.currentIp) return;

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    logger.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(this.currentIp!, this.currentProtocol);
    }, delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const wledWebSocketService = new WledWebSocketService();
