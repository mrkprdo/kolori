import * as ServiceDiscovery from "@inthepocket/react-native-service-discovery";
import type {
  Service,
  Subscription,
} from "@inthepocket/react-native-service-discovery";
import Constants from "expo-constants";

export interface MdnsWledDevice {
  name: string;
  host: string;
  port: number;
  addresses: string[];
  txt: Record<string, string>;
  fullName: string;
  type: string;
  domain: string;
  wledInfo?: WledDeviceInfo;
}

interface WledDeviceInfo {
  version?: string;
  brand?: string;
  product?: string;
  mac?: string;
  arch?: string;
}

export interface MdnsDiscoveryListeners {
  onDeviceFound?: (device: MdnsWledDevice) => void;
  onDeviceRemoved?: (device: MdnsWledDevice) => void;
  onScanStart?: () => void;
  onScanStop?: () => void;
  onError?: (error: string) => void;
}

interface ValidationResult {
  isValid: boolean;
  deviceInfo?: any;
  error?: string;
}

interface DeviceNameResult {
  success: boolean;
  deviceName?: string;
  error?: string;
}

export class WledMdnsDiscovery {
  private isScanning = false;
  private discoveredDevices = new Map<string, MdnsWledDevice>();
  private listeners: MdnsDiscoveryListeners = {};
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private serviceFoundSubscription: Subscription | null = null;
  private serviceLostSubscription: Subscription | null = null;
  private scanTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.initializationPromise = this.initializeServiceDiscovery();
  }

  private async initializeServiceDiscovery(): Promise<void> {
    try {
      if (this.isRunningInExpoGo()) {
        this.handleExpoGoLimitation();
        return;
      }

      await this.waitForNativeModule();
      this.setupEventListeners();
      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize mDNS Service Discovery:", error);
      this.isInitialized = false;
    }
  }

  private isRunningInExpoGo(): boolean {
    return Constants.appOwnership === "expo";
  }

  private handleExpoGoLimitation(): void {
    console.warn(
      "mDNS is not supported in Expo Go. Use a development build to enable network discovery."
    );
    this.isInitialized = false;
  }

  private async waitForNativeModule(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  private setupEventListeners(): void {
    this.serviceFoundSubscription = ServiceDiscovery.addEventListener(
      "serviceFound",
      this.handleServiceFound.bind(this)
    );

    this.serviceLostSubscription = ServiceDiscovery.addEventListener(
      "serviceLost",
      this.handleServiceLost.bind(this)
    );
  }

  private handleServiceFound = (service: Service): void => {
    if (this.isWledService(service)) {
      const device = this.createDeviceFromService(service);
      this.discoveredDevices.set(service.name, device);
      this.listeners.onDeviceFound?.(device);
    }
  };

  private handleServiceLost = (service: Service): void => {
    const device = this.discoveredDevices.get(service.name);

    if (device) {
      this.discoveredDevices.delete(service.name);
      this.listeners.onDeviceRemoved?.(device);
    }
  };

  private createDeviceFromService(service: Service): MdnsWledDevice {
    return {
      name: service.name,
      host: service.hostName,
      port: service.port || 80,
      addresses: service.addresses || [],
      txt: service.txt || {},
      fullName: `${service.name}.${service.type}${service.domain}`,
      type: service.type,
      domain: service.domain,
      wledInfo: this.extractWledInfo(service.txt || {}),
    };
  }

  private isWledService(service: Service): boolean {
    const name = service.name?.toLowerCase() || "";
    const txt = service.txt || {};
    const host = service.hostName?.toLowerCase() || "";

    // Check direct WLED indicators
    if (this.hasDirectWledIndicators(name, txt)) {
      return true;
    }

    // Check ESP devices that might be WLED
    if (this.isEspBasedWledDevice(name, host, txt, service.port)) {
      return true;
    }

    // Check common WLED device patterns
    if (this.hasWledPatterns(name, host)) {
      return true;
    }

    // iOS-specific: Be more permissive for HTTP services on port 80
    if (this.isLikelyWledOnIOS(service)) {
      return true;
    }

    return false;
  }

  private hasDirectWledIndicators(
    name: string,
    txt: Record<string, string>
  ): boolean {
    return (
      name.includes("wled") || txt.brand === "WLED" || txt.product === "WLED"
    );
  }

  private isEspBasedWledDevice(
    name: string,
    host: string,
    txt: Record<string, string>,
    port?: number
  ): boolean {
    const isEspDevice = name.includes("esp") || host.includes("esp");
    const hasWledPath = txt.path === "/" || txt.path === "/json" || port === 80;
    return isEspDevice && hasWledPath;
  }

  private hasWledPatterns(name: string, host: string): boolean {
    const wledPatterns = [
      "wled-",
      "esp32-",
      "esp8266-",
      "pixelblaze",
      "fastled",
    ];
    return wledPatterns.some(
      (pattern) => name.includes(pattern) || host.includes(pattern)
    );
  }

  private isLikelyWledOnIOS(service: Service): boolean {
    // On iOS, mDNS responses might be different, so be more permissive
    const isHttpService =
      service.type?.includes("_http._tcp") || service.port === 80;
    const hasValidHost = service.hostName && service.hostName.length > 0;
    const hasValidName = service.name && service.name.length > 0;

    // For iOS, accept any HTTP service that we can validate later
    if (isHttpService && hasValidHost && hasValidName) {
      // Additional checks to avoid false positives
      const name = service.name?.toLowerCase() || "";
      const host = service.hostName?.toLowerCase() || "";

      // Skip common non-WLED services
      const skipPatterns = [
        "airplay",
        "homekit",
        "printer",
        "scanner",
        "apple",
        "iphone",
        "ipad",
        "mac",
      ];
      const shouldSkip = skipPatterns.some(
        (pattern) => name.includes(pattern) || host.includes(pattern)
      );

      return !shouldSkip;
    }

    return false;
  }

  private extractWledInfo(txt: Record<string, string>): WledDeviceInfo {
    return {
      version: txt.ver || txt.version || txt.v,
      brand: txt.brand || txt.b,
      product: txt.product || txt.prod || txt.p,
      mac: txt.mac || txt.m,
      arch: txt.arch || txt.a,
    };
  }

  public async startScan(): Promise<void> {
    if (this.isScanning) {
      return;
    }

    await this.ensureInitialized();

    if (!this.isInitialized) {
      return;
    }

    try {
      this.prepareScan();
      await this.performScan();
      this.scheduleAutoStop();
    } catch (error) {
      this.handleScanError(error);
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized && this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  private prepareScan(): void {
    this.clearExistingTimeout();
    this.discoveredDevices.clear();
    this.isScanning = true;
    this.listeners.onScanStart?.();
  }

  private clearExistingTimeout(): void {
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
  }

  private async performScan(): Promise<void> {
    await ServiceDiscovery.startSearch("http");
  }

  private scheduleAutoStop(): void {
    this.scanTimeout = setTimeout(() => {
      this.forceStopScan();
    }, 2000);
  }

  private handleScanError(error: any): void {
    console.error("Failed to start mDNS scan:", error);
    this.isScanning = false;
    this.listeners.onError?.(`Failed to start scan: ${error}`);
  }

  private forceStopScan(): void {
    if (!this.isScanning) {
      return;
    }

    this.isScanning = false;
    this.clearExistingTimeout();
    this.stopNativeScan();
    this.listeners.onScanStop?.();
  }

  private stopNativeScan(): void {
    ServiceDiscovery.stopSearch("http").catch((error) =>
      console.error("Failed to stop native scan:", error)
    );
  }

  public async stopScan(): Promise<void> {
    if (!this.isInitialized || !this.isScanning) {
      return;
    }

    this.forceStopScan();
  }

  public getDiscoveredDevices(): MdnsWledDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  public setListeners(listeners: MdnsDiscoveryListeners): void {
    this.listeners = listeners;
  }

  public isScanningActive(): boolean {
    return this.isScanning;
  }

  public async getWledDeviceName(
    device: MdnsWledDevice | any
  ): Promise<DeviceNameResult> {
    const address = device.addresses?.[0] || device.host || device.ip;
    const port = device.port || 80;
    const url = this.buildDeviceUrl(address, port, "/win");

    try {
      const response = await this.fetchWithTimeout(
        url,
        {
          method: "GET",
          headers: {
            Accept: "text/xml,application/xml,text/plain",
          },
        },
        5000
      );

      if (response.ok) {
        const xmlData = await response.text();
        return this.parseDeviceNameFromXml(xmlData);
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error: any) {
      console.error("Device name fetch error:", error);
      return {
        success: false,
        error: `Failed to get device name: ${this.parseErrorMessage(error)}`,
      };
    }
  }

  private buildDeviceUrl(
    address: string,
    port: number,
    endpoint: string
  ): string {
    return port === 80
      ? `http://${address}${endpoint}`
      : `http://${address}:${port}${endpoint}`;
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private parseDeviceNameFromXml(xmlData: string): DeviceNameResult {
    const dsMatch = xmlData.match(/<ds>([^<]*)<\/ds>/);

    if (dsMatch && dsMatch[1]) {
      const deviceName = dsMatch[1].trim();
      return {
        success: true,
        deviceName,
      };
    } else {
      return {
        success: false,
        error: "Device name not found in response",
      };
    }
  }

  private parseErrorMessage(error: any): string {
    if (error.name === "AbortError") {
      return "Request timeout";
    }
    return error.message || "Unknown error";
  }

  public async validateWledDevice(
    device: MdnsWledDevice | any
  ): Promise<ValidationResult> {
    const port = device.port || 80;
    const addressesToTry = this.getAddressesToTry(device);

    for (const testAddress of addressesToTry) {
      const result = await this.tryValidateAddress(
        testAddress,
        port,
        device.name
      );
      if (result.isValid) {
        return result;
      }
    }

    return {
      isValid: false,
      error: `All addresses failed. Tried: ${addressesToTry.join(", ")}`,
    };
  }

  private getAddressesToTry(device: any): string[] {
    const addressesToTry: string[] = [];

    // Prefer IP addresses first
    if (device.addresses?.length > 0) {
      device.addresses.forEach((addr: string) => {
        if (this.isValidIPAddress(addr)) {
          addressesToTry.push(addr);
        }
      });
    }

    // Add valid hostnames with .local suffix for mDNS
    if (device.host) {
      if (this.isValidIPAddress(device.host)) {
        if (!addressesToTry.includes(device.host)) {
          addressesToTry.push(device.host);
        }
      } else if (!device.host.includes(".")) {
        const mdnsHost = `${device.host}.local`;
        if (!addressesToTry.includes(mdnsHost)) {
          addressesToTry.push(mdnsHost);
        }
      }
    }

    if (
      device.ip &&
      this.isValidIPAddress(device.ip) &&
      !addressesToTry.includes(device.ip)
    ) {
      addressesToTry.push(device.ip);
    }

    return addressesToTry;
  }

  private async tryValidateAddress(
    address: string,
    port: number,
    deviceName: string
  ): Promise<ValidationResult> {
    const endpoints = ["/json/info", "/json", "/win"];

    for (const endpoint of endpoints) {
      const url = this.buildDeviceUrl(address, port, endpoint);

      try {
        const response = await this.fetchWithTimeout(
          url,
          {
            method: "GET",
            headers: {
              Accept: "application/json, text/xml, text/plain",
              "User-Agent": "Kolori-WLED-App/1.0",
            },
          },
          8000
        );

        if (response.ok) {
          const result = await this.processEndpointResponse(response, endpoint);
          if (result.isValid) {
            return result;
          }
        }
      } catch (error: any) {
        if (this.isNetworkSecurityError(error)) {
          return {
            isValid: false,
            error: this.parseNetworkError(error, url),
          };
        }
      }
    }

    return {
      isValid: false,
      error: `No valid WLED endpoints found on ${address}:${port}`,
    };
  }

  private async processEndpointResponse(
    response: Response,
    endpoint: string
  ): Promise<ValidationResult> {
    if (endpoint === "/json/info" || endpoint === "/json") {
      return this.processJsonResponse(response, endpoint);
    } else if (endpoint === "/win") {
      return this.processXmlResponse(response);
    }

    return { isValid: false, error: "Unknown endpoint" };
  }

  private async processJsonResponse(
    response: Response,
    endpoint: string
  ): Promise<ValidationResult> {
    try {
      const data = await response.json();

      if (
        data.ver ||
        data.name ||
        data.brand === "WLED" ||
        data.arch ||
        data.info
      ) {
        return {
          isValid: true,
          deviceInfo: data,
        };
      }
    } catch (jsonError) {
      // JSON parsing failed
    }

    return { isValid: false };
  }

  private async processXmlResponse(
    response: Response
  ): Promise<ValidationResult> {
    try {
      const xmlData = await response.text();

      if (
        xmlData.includes("<ds>") ||
        xmlData.includes("WLED") ||
        xmlData.includes("<ac>")
      ) {
        return {
          isValid: true,
          deviceInfo: { fromXml: true, hasWinEndpoint: true },
        };
      }
    } catch (xmlError) {
      // XML parsing failed
    }

    return { isValid: false };
  }

  private isNetworkSecurityError(error: any): boolean {
    return (
      error.message?.includes("cleartext") ||
      error.message?.includes("CLEARTEXT") ||
      error.message?.includes("Network request failed")
    );
  }

  private parseNetworkError(error: any, url: string): string {
    const errorMessages = {
      AbortError: "Connection timeout - device may be slow to respond",
      NetworkFailed: `Network connection failed to ${url}. Check if device is accessible and Android network security allows HTTP connections`,
      CleartextBlocked: `Android blocked HTTP connection to ${url}. Network security config may need updating`,
      CleartextPolicy:
        "Android security policy blocks HTTP connections to this IP range",
    };

    if (error.name === "AbortError") {
      return errorMessages.AbortError;
    } else if (error.message?.includes("Network request failed")) {
      return errorMessages.NetworkFailed;
    } else if (error.message?.includes("cleartext")) {
      return errorMessages.CleartextBlocked;
    } else if (error.message?.includes("CLEARTEXT")) {
      return errorMessages.CleartextPolicy;
    } else {
      return `Network error: ${error.message}`;
    }
  }

  private isValidIPAddress(ip: string): boolean {
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  }

  public async destroy(): Promise<void> {
    this.forceStopScan();
    this.discoveredDevices.clear();
    this.listeners = {};
    this.removeEventListeners();
  }

  private removeEventListeners(): void {
    if (this.serviceFoundSubscription) {
      this.serviceFoundSubscription.remove();
      this.serviceFoundSubscription = null;
    }
    if (this.serviceLostSubscription) {
      this.serviceLostSubscription.remove();
      this.serviceLostSubscription = null;
    }
  }
}

// Export singleton instance
export const wledMdnsDiscovery = new WledMdnsDiscovery();
