import * as dgram from 'dgram';
import { Logger } from 'homebridge';
import { EncryptionService } from './encryptionService';

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
  private statusInterval?: NodeJS.Timeout;

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

  private setDevice(id: string, name: string, address: string, port?: number) {
    this.device.id = id;
    this.device.name = name;
    this.device.address = address;
    this.device.port = port || this.options.defaultPort;
    this.device.bound = false;
    this.device.props = {};
    this.log('New device added', this.device);
  }

  private sendBindRequest(device: DeviceState) {
    const message = {
      mac: this.device.id,
      t: 'bind',
      uid: 0,
    };
    const encryptedBoundMessage = EncryptionService.encrypt(message);
    const request = {
      cid: 'app',
      i: 1,
      t: 'pack',
      uid: 0,
      pack: encryptedBoundMessage,
    };
    const toSend = Buffer.from(JSON.stringify(request));
    this.socket.send(toSend, 0, toSend.length, device.port!, device.address!, (error) => {
      if (error) {
        this.log('sendBindRequest socket error', error);
      }
    });
  }

  private confirmBinding(id: string, key: string) {
    this.device.bound = true;
    this.device.key = key;
    this.log(`Device is bound: ${this.device.name} - ${this.device.key}`);
  }

  private requestDeviceStatus(device: DeviceState) {
    const message = {
      cols: ['Pow', 'Mod', 'SetTem', 'WdSpd', 'Air', 'Blo', 'Health', 'SwhSlp', 'SlpMod', 'SwingLfRig', 'SwUpDn', 'Quiet', 'Tur', 'StHt', 'TemUn', 'HeatCoolType', 'TemRec', 'SvSt', 'TemSen'],
      mac: device.id,
      t: 'status',
    };
    this.sendRequest(message, device.address!, device.port!);
  }

  private sendRequest(message: any, address: string = this.device.address!, port: number = this.device.port!) {
    const encryptedMessage = EncryptionService.encrypt(message, this.device.key);
    const request = {
      cid: 'app',
      i: 0,
      t: 'pack',
      uid: 0,
      pack: encryptedMessage,
    };
    const serializedRequest = Buffer.from(JSON.stringify(request));
    try {
      this.socket.send(serializedRequest, 0, serializedRequest.length, port, address, (error) => {
        if (error) {
          this.log('sendRequest socket error', error);
        }
      });
    } catch (e) {
      this.log('sendRequest error', e);
    }
  }

  private handleResponse(msg: Buffer, rinfo: dgram.RemoteInfo) {
    if (rinfo.address !== this.options.host) {
      this.log(`Received response from ${rinfo.address} but looking for ${this.options.host}`);
      return;
    }

    const message = JSON.parse(msg.toString());
    
    try {
      // Extract encrypted package from message using device key (if available)
      const pack = EncryptionService.decrypt(message, this.device.key);
      
      // If package type is response to handshake
      if (pack.t === 'dev') {
        this.log('Response to handshake:', rinfo);
        this.setDevice(message.cid, pack.name, rinfo.address, rinfo.port);
        this.sendBindRequest(this.device);
        return;
      }

      // If package type is binding confirmation
      if (pack.t === 'bindok') {
        this.confirmBinding(message.cid, pack.key);

        // Start requesting device status on set interval
        this.statusInterval = setInterval(() => {
          this.requestDeviceStatus(this.device);
        }, this.options.updateInterval);
        
        this.options.onConnected(this.device);
        return;
      }

      // If package type is device status
      if (pack.t === 'dat' && this.device.bound) {
        pack.cols.forEach((col: string, i: number) => {
          this.device.props![col] = pack.dat[i];
        });
        this.options.onStatus(this.device);
        return;
      }

      // If package type is response, update device properties
      if (pack.t === 'res' && this.device.bound) {
        pack.opt.forEach((opt: string, i: number) => {
          this.device.props![opt] = pack.val[i];
        });
        this.options.onUpdate(this.device);
        return;
      }
      
      this.options.onError(this.device);
    } catch (err) {
      this.log('handleResponse error', msg, rinfo, err);
      this.options.onError(this.device);
    }
  }

  public disconnect() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }
    if (this.socket) {
      this.socket.close();
    }
  }

  public getDeviceState(): DeviceState {
    return this.device;
  }
}
