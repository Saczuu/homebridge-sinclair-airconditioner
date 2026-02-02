import dgram from 'dgram';
import { EventEmitter } from 'events';
import encryptionService from './encryptionService';
import * as cmd from './commandEnums';

export interface DeviceProps {
  [key: string]: number;
}

export interface DeviceState {
  id: string;
  name: string;
  address: string;
  port: number;
  bound: boolean;
  key?: string;
  props: DeviceProps;
}

export interface SinclairOptions {
  host: string;
  defaultPort?: number;
  updateInterval?: number;
}

export class SinclairAPI extends EventEmitter {
  private socket: dgram.Socket;
  private device: DeviceState;
  private options: Required<SinclairOptions>;

  constructor(options: SinclairOptions) {
    super();
    this.options = {
      defaultPort: 7000,
      updateInterval: 10000,
      ...options,
    };

    this.options.defaultPort = options.defaultPort || 7000;

    this.options.updateInterval = options.updateInterval || 10000;

    const lastOctet = parseInt(this.options.host.split('.')[3]);
    const bindPort = 8000 + lastOctet;

    this.device = {
      id: '',
      name: '',
      address: options.host,
      port: this.options.defaultPort,
      bound: false,
      props: {},
    };

    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    this.socket.on('message', (msg, rinfo) => this.handleResponse(msg, rinfo));

    this.connect(bindPort);
  }

  private connect(bindPort: number) {
    try {
      this.socket.bind(bindPort, '0.0.0.0', () => {
        const message = Buffer.from(JSON.stringify({ t: 'scan' }));
        this.socket.setBroadcast(false);
        console.log(`[SinclairAPI] Scanning ${this.options.host} from port ${bindPort}`);
        this.socket.send(message, 0, message.length, this.options.defaultPort, this.options.host);
      });
    } catch (err) {
      console.log('[SinclairAPI] Connection error', err);
      setTimeout(() => this.connect(bindPort), 5000);
    }
  }

  private handleResponse(msg: Buffer, rinfo: dgram.RemoteInfo) {
    if (rinfo.address !== this.options.host) return;

    try {
      const message = JSON.parse(msg.toString());
      const pack = encryptionService.decrypt(message, this.device.key);

      if (pack.t === 'dev') {
        this.device.id = message.cid;
        this.device.name = pack.name;
        this.device.port = rinfo.port;
        this.sendBindRequest();
      }

      if (pack.t === 'bindok') {
        this.device.bound = true;
        this.device.key = pack.key;
        this.emit('connected', this.device);
        setInterval(() => this.requestStatus(), this.options.updateInterval);
      }

      if (pack.t === 'dat' && this.device.bound) {
        pack.cols.forEach((col: string, i: number) => {
          this.device.props[col] = pack.dat[i];
        });
        this.emit('status', this.device);
      }

      if (pack.t === 'res' && this.device.bound) {
        pack.opt.forEach((opt: string, i: number) => {
          this.device.props[opt] = pack.val[i];
        });
        this.emit('update', this.device);
      }
    } catch (err) {
      console.log('[SinclairAPI] Response error', err);
      this.emit('error', err);
    }
  }

  private sendBindRequest() {
    const message = { mac: this.device.id, t: 'bind', uid: 0 };
    const encrypted = encryptionService.encrypt(message);
    const request = {
      cid: 'app',
      i: 1,
      t: 'pack',
      uid: 0,
      pack: encrypted,
    };
    const buffer = Buffer.from(JSON.stringify(request));
    this.socket.send(buffer, 0, buffer.length, this.device.port, this.device.address);
  }

  private requestStatus() {
    if (!this.device.bound) return;
    const message = { cols: Object.values(cmd).map(c => c.code), mac: this.device.id, t: 'status' };
    this.sendRequest(message);
  }

  private sendRequest(message: any) {
    const encrypted = encryptionService.encrypt(message, this.device.key);
    const request = {
      cid: 'app',
      i: 0,
      t: 'pack',
      uid: 0,
      pack: encrypted,
    };
    const buffer = Buffer.from(JSON.stringify(request));
    this.socket.send(buffer, 0, buffer.length, this.device.port, this.device.address);
  }

  // Commands
  setPower(on: boolean) {
    this.sendCommand([cmd.power.code], [on ? 1 : 0]);
  }

  setTemp(value: number, unit: number = cmd.temperatureUnit.value.celsius) {
    this.sendCommand([cmd.temperatureUnit.code, cmd.temperature.code], [unit, value]);
  }

  setMode(value: number) {
    this.sendCommand([cmd.mode.code], [value]);
  }

  setFanSpeed(value: number) {
    this.sendCommand([cmd.fanSpeed.code], [value]);
  }

  private sendCommand(commands: string[], values: number[]) {
    this.sendRequest({ opt: commands, p: values, t: 'cmd' });
  }

  // Getters
  getPower() { return this.device.props[cmd.power.code] || 0; }
  getTemp() { return this.device.props[cmd.temperature.code] || 0; }
  getMode() { return this.device.props[cmd.mode.code] || 0; }
  getFanSpeed() { return this.device.props[cmd.fanSpeed.code] || 0; }
  getDevice() { return this.device; }
}
