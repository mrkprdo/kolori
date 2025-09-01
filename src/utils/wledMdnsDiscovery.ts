// WLED mDNS Discovery Service - Pure mDNS implementation
import Zeroconf from 'react-native-zeroconf';
import Constants from 'expo-constants';

export interface MdnsWledDevice {
  name: string;
  host: string;
  port: number;
  addresses: string[];
  txt: Record<string, string>;
  fullName: string;
  type: string;
  protocol: string;
  wledInfo?: {
    version?: string;
    brand?: string;
    product?: string;
    mac?: string;
  };
}

export interface MdnsDiscoveryListeners {
  onDeviceFound?: (device: MdnsWledDevice) => void;
  onDeviceRemoved?: (device: MdnsWledDevice) => void;
  onScanStart?: () => void;
  onScanStop?: () => void;
  onError?: (error: string) => void;
}

export class WledMdnsDiscovery {
  private zeroconf: Zeroconf | null = null;
  private isScanning: boolean = false;
  private discoveredDevices: Map<string, MdnsWledDevice> = new Map();
  private listeners: MdnsDiscoveryListeners = {};
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.initializationPromise = this.initializeZeroconf();
  }

  private async initializeZeroconf(): Promise<void> {
    try {
      console.log('Initializing mDNS Zeroconf...');
      
      // Check if running in Expo Go (which doesn't support native modules)
      if (Constants.appOwnership === 'expo') {
        console.warn('mDNS is not supported in Expo Go. Network discovery will be disabled.');
        console.log('To enable network discovery, use a development build: npx expo run:android or npx expo run:ios');
        this.isInitialized = false;
        return;
      }
      
      // Add a small delay to ensure the native module is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.zeroconf = new Zeroconf();
      
      // Wait a bit more for the native initialization
      await new Promise(resolve => setTimeout(resolve, 200));
      
      this.setupEventListeners();
      this.isInitialized = true;
      console.log('mDNS Zeroconf initialized successfully');
    } catch (error) {
      console.error('Failed to initialize mDNS Zeroconf:', error);
      this.isInitialized = false;
    }
  }

  private setupEventListeners() {
    if (!this.zeroconf) return;

    // Service found
    this.zeroconf.on('found', (service: any) => {
      console.log('mDNS service found:', service.name);
    });

    // Service resolved with full details
    this.zeroconf.on('resolved', (service: any) => {
      console.log('mDNS service resolved:', service);
      
      // Check if this is a WLED device
      if (this.isWledService(service)) {
        const device: MdnsWledDevice = {
          name: service.name,
          host: service.host,
          port: service.port || 80,
          addresses: service.addresses || [],
          txt: service.txt || {},
          fullName: service.fullName,
          type: service.type,
          protocol: service.protocol,
          wledInfo: this.extractWledInfo(service.txt || {}),
        };

        this.discoveredDevices.set(service.name, device);
        
        if (this.listeners.onDeviceFound) {
          this.listeners.onDeviceFound(device);
        }
      }
    });

    // Service removed
    this.zeroconf.on('remove', (service: any) => {
      console.log('mDNS service removed:', service.name);
      const device = this.discoveredDevices.get(service.name);
      if (device) {
        this.discoveredDevices.delete(service.name);
        if (this.listeners.onDeviceRemoved) {
          this.listeners.onDeviceRemoved(device);
        }
      }
    });

    // Scan started
    this.zeroconf.on('start', () => {
      console.log('mDNS scan started');
      this.isScanning = true;
      if (this.listeners.onScanStart) {
        this.listeners.onScanStart();
      }
    });

    // Scan stopped
    this.zeroconf.on('stop', () => {
      console.log('mDNS scan stopped');
      this.isScanning = false;
      if (this.listeners.onScanStop) {
        this.listeners.onScanStop();
      }
    });

    // Error handling
    this.zeroconf.on('error', (error: any) => {
      console.error('mDNS error:', error);
      this.isScanning = false;
      if (this.listeners.onError) {
        this.listeners.onError(error.toString());
      }
    });
  }

  // Determine if a service is a WLED device
  private isWledService(service: any): boolean {
    const name = service.name?.toLowerCase() || '';
    const txt = service.txt || {};
    const host = service.host?.toLowerCase() || '';
    
    // Primary checks for WLED devices
    if (name.includes('wled')) {
      return true;
    }
    
    // Check TXT records for WLED indicators
    if (txt.brand === 'WLED' || txt.product === 'WLED') {
      return true;
    }
    
    // Check for ESP devices that might be WLED (common pattern)
    if (name.includes('esp') || host.includes('esp')) {
      // Additional checks for ESP-based WLED devices
      if (txt.path === '/' || txt.path === '/json' || service.port === 80) {
        return true;
      }
    }
    
    // Check for common WLED device name patterns
    const wledPatterns = [
      'wled-',
      'esp32-',
      'esp8266-',
      'pixelblaze',
      'fastled'
    ];
    
    return wledPatterns.some(pattern => 
      name.includes(pattern) || host.includes(pattern)
    );
  }

  // Extract WLED-specific information from TXT records
  private extractWledInfo(txt: Record<string, string>): any {
    return {
      version: txt.ver || txt.version || txt.v,
      brand: txt.brand || txt.b,
      product: txt.product || txt.prod || txt.p,
      mac: txt.mac || txt.m,
      arch: txt.arch || txt.a,
    };
  }

  // Start mDNS scanning for HTTP services
  public async startScan(): Promise<void> {
    if (this.isScanning) {
      console.log('mDNS scan already in progress');
      return;
    }

    // Wait for initialization to complete
    if (!this.isInitialized && this.initializationPromise) {
      console.log('Waiting for mDNS initialization...');
      await this.initializationPromise;
    }

    if (!this.isInitialized || !this.zeroconf) {
      console.log('mDNS discovery not available - running in Expo Go or initialization failed');
      return;
    }

    try {
      // Clear previous discoveries
      this.discoveredDevices.clear();
      
      // Scan for HTTP services where WLED devices announce themselves
      this.zeroconf.scan('http', 'tcp', 'local.');
      
      console.log('Started mDNS scan for WLED devices on _http._tcp');
    } catch (error) {
      console.error('Failed to start mDNS scan:', error);
      if (this.listeners.onError) {
        this.listeners.onError(`Failed to start scan: ${error}`);
      }
    }
  }

  // Stop mDNS scanning
  public stopScan(): void {
    if (!this.isScanning || !this.zeroconf || !this.isInitialized) {
      return;
    }

    try {
      this.zeroconf.stop();
      console.log('Stopped mDNS scanning');
    } catch (error) {
      console.error('Failed to stop mDNS scan:', error);
    }
  }

  // Get all discovered WLED devices
  public getDiscoveredDevices(): MdnsWledDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  // Set event listeners
  public setListeners(listeners: MdnsDiscoveryListeners): void {
    this.listeners = listeners;
  }

  // Check if currently scanning
  public isScanningActive(): boolean {
    return this.isScanning;
  }

  // Validate WLED device by making HTTP request to /json/info
  public async validateWledDevice(device: MdnsWledDevice): Promise<{
    isValid: boolean;
    deviceInfo?: any;
    error?: string;
  }> {
    const address = device.addresses[0] || device.host;
    const port = device.port || 80;
    const url = `http://${address}:${port}/json/info`;

    try {
      console.log(`Validating WLED device at ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        
        // Verify this is actually a WLED device
        if (data.ver || data.name || data.brand === 'WLED' || data.arch) {
          return {
            isValid: true,
            deviceInfo: data,
          };
        }
      }
      
      return {
        isValid: false,
        error: 'Device is not a WLED device',
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Validation failed: ${error}`,
      };
    }
  }

  // Clean up resources
  public destroy(): void {
    this.stopScan();
    this.discoveredDevices.clear();
    this.listeners = {};
    
    if (this.zeroconf) {
      try {
        this.zeroconf.removeAllListeners();
      } catch (error) {
        console.error('Error cleaning up zeroconf listeners:', error);
      }
    }
  }
}

// Export singleton instance
export const wledMdnsDiscovery = new WledMdnsDiscovery();