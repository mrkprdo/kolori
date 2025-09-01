declare module 'react-native-zeroconf' {
  export interface ZeroconfService {
    name: string;
    host: string;
    port: number;
    fullName: string;
    addresses: string[];
    txt?: Record<string, any>;
  }

  export default class Zeroconf {
    scan(type?: string, protocol?: string, domain?: string): void;
    stop(): void;
    on(event: 'start' | 'stop', callback: () => void): void;
    on(event: 'error', callback: (error: any) => void): void;
    on(event: 'found' | 'remove' | 'resolved', callback: (service: ZeroconfService) => void): void;
    off(event: string, callback?: Function): void;
    removeAllListeners(): void;
  }
}