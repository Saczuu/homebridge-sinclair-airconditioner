import * as dgram from 'dgram';
import { Logger } from 'homebridge';

interface DeviceOptions {
  host: string;
  defaultPort?: number;
  onStatus?: (device: DeviceState) => void;
  onUpdate?: (device: DeviceState) => void;
  onConnected?: (device: DeviceState) => void;
  onError?: (device: DeviceState) => void;
  onDisconnected?: (device: DeviceState) => void;
  updateInterval?: number;
  logger?: Logger;
}

interface DeviceState {
  id?: string;
  name?: string;
  address?: string;
  port?: number;
  bound?: boolean;
  key?: string;
  props?: Record<string, number>;
}

export class SinclairApi {
  private socket: dgram.Socket;
  private options: Required<DeviceOptions>;
  private device: DeviceState = {};
  private port: number;

  constructor(options: DeviceOptions) {
    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    
    // Calculate port: 8000 + last octet of IP address
    const lastOctet = parseInt(options.host.split('.')[3]);
    this.port = 8000 + lastOctet;

    // Set defaults
    this.options = {
      host: options.host,
      defaultPort: options.defaultPort || 7000,
      onStatus: options.onStatus || (() => {}),
      onUpdate: options.onUpdate || (() => {}),
      onConnected: options.onConnected || ((device) => {
        this.log(`Connected to host ${options.host}`);
      }),
      onError: options.onError || (() => {
        this.log(`Error occurred ${options.host}`);
      }),
      onDisconnected: options.onDisconnected || (() => {
        this.log(`Disconnected from host ${options.host}`);
      }),
      updateInterval: options.updateInterval || 10000,
      logger: options.logger,
    };

    this.log(`Initializing device on host ${this.options.host} [server port ${this.port}]`);

    this.device.props = {};
    
    // Initialize connection
    this.connectToDevice(this.options.host, this.port);

    // Handle incoming messages
    this.socket.on('message', (msg, rinfo) => this.handleResponse(msg, rinfo));
  }

  private log(message: string, ...args: unknown[]) {
    if (this.options.logger) {
      this.options.logger.info(message, ...args);
    } else {
      console.log(`[SinclairAC]: ${message}`, ...args);
    }
  }

  private connectToDevice(address: string, port: number) {
    try {
      this.socket.bind(port, '0.0.0.0', () => {
        const message = Buffer.from(JSON.stringify({ t: 'scan' }));
        this.socket.setBroadcast(false);
        this.log(`Connecting to ${address} [using source port ${port}]`);
        this.socket.send(message, 0, message.length, this.options.defaultPort, address, (error) => {
          if (error) {
            this.log(`connectToDevice socket error ${address}: ${error}`);
          }
        });
      });
    } catch (err) {
      this.log(`connectToDevice error - port ${port}: ${err}`);
      const timeout = 5;
      this.options.onDisconnected(this.device);
      setTimeout(() => {
        this.connectToDevice(address, port);
      }, timeout * 1000);
    }
  }

  private handleResponse(msg: Buffer, rinfo: dgram.RemoteInfo) {
    if (rinfo.address !== this.options.host) {
      this.log(`Received response from ${rinfo.address} but looking for ${this.options.host}`);
      return;
    }

    const message = JSON.parse(msg.toString());
    this.log(`Received message from ${rinfo.address}:${rinfo.port}`, message);
    
    // TODO: Implement encryption/decryption and message handling
    // This will be added in the next step
  }

  public disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}