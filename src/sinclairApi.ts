import dgram from 'dgram';
import { EventEmitter } from 'events';

export interface SinclairDeviceInfo {
  id: string;
  key: string;
  ip: string;
  port: number;
}

export interface SinclairApiOptions {
  host: string;
  port?: number;
  debug?: boolean;
  retryInterval?: number;
}

export class SinclairApi extends EventEmitter {
  private socket: dgram.Socket;
  private device?: SinclairDeviceInfo;
  private host: string;
  private port: number;
  private debug: boolean;
  private retryInterval: number;
  private retryTimer?: NodeJS.Timeout;

  constructor(options: SinclairApiOptions) {
    super();
    this.host = options.host;
    this.port = options.port || 7000;
    this.debug = options.debug || false;
    this.retryInterval = (options.retryInterval || 5) * 1000;

    this.socket = dgram.createSocket('udp4');
    this.socket.on('message', (msg, rinfo) => this.handleMessage(msg, rinfo));
    this.socket.on('error', (err) => this.emit('error', err));

    this.startDiscovery();
  }

  private log(...args: any[]) {
    if (this.debug) console.log('[SinclairAPI]', ...args);
  }

  private startDiscovery() {
    this.log('Starting discovery loop...');
    this.sendScan();

    this.retryTimer = setInterval(() => {
      if (!this.device) {
        this.log('Retrying scan...');
        this.sendScan();
      }
    }, this.retryInterval);
  }

  private sendScan() {
    const payload = JSON.stringify({ cmd: 'scan' });
    this.socket.send(payload, this.port, this.host, (err) => {
      if (err) this.emit('error', err);
      else this.log('Scan sent to', this.host);
    });
  }

  private handleMessage(msg: Buffer, rinfo: dgram.RemoteInfo) {
    this.log('Received UDP message:', msg.toString());
    try {
      const data = JSON.parse(msg.toString());
      if (data.cmd === 'report' && data.data?.id) {
        this.device = {
          id: data.data.id,
          key: data.data.key,
          ip: rinfo.address,
          port: rinfo.port
        };
        this.log('Device discovered:', this.device.id);
        this.emit('connected', this.device);
        if (this.retryTimer) clearInterval(this.retryTimer);
        this.sendBind();
      }
    } catch (err) {
      this.log('Failed to parse message:', err);
    }
  }

  private sendBind() {
    if (!this.device) return;
    const payload = JSON.stringify({ cmd: 'bind', id: this.device.id });
    this.socket.send(payload, this.port, this.host, (err) => {
      if (err) this.emit('error', err);
      else this.log('Bind sent to device', this.device?.id);
    });
  }

  public sendCommand(command: object) {
    if (!this.device) {
      this.log('Cannot send command, device not connected yet');
      return;
    }
    const payload = JSON.stringify(command);
    this.socket.send(payload, this.port, this.host, (err) => {
      if (err) this.emit('error', err);
      else this.log('Command sent:', command);
    });
  }

  public close() {
    if (this.retryTimer) clearInterval(this.retryTimer);
    this.socket.close();
  }
}
