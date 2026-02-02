import dgram from 'dgram';
import crypto from 'crypto';

export interface SinclairState {
  power?: boolean;
  mode?: number; // 0 auto, 1 cool, 2 dry, 3 fan, 4 heat
  temp?: number; // 16–30
  fan?: number;  // 0–5
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timeout: NodeJS.Timeout;
}

export class SinclairApi {
  private socket = dgram.createSocket('udp4');

  private deviceId?: string;
  private key = '0123456789abcdef';

  private readonly port = 7000;
  private readonly timeoutMs = 3000;

  private pending?: PendingRequest;

  constructor(
    private readonly host: string,
    private readonly log: (msg: string) => void,
    private readonly debug = false,
  ) {
    this.socket.on('message', msg => this.onMessage(msg));
    this.socket.on('error', err => {
      this.log(`UDP error: ${err.message}`);
    });
  }

  /* ---------- Public API ---------- */

  async init(): Promise<void> {
    await this.handshake();
    await this.bind();
  }

  async getStatus(): Promise<SinclairState> {
    const res = await this.send({
      cmd: 'get',
      cols: ['Pow', 'Mod', 'SetTem', 'WdSpd'],
    });

    return {
      power: res.Pow === 1,
      mode: res.Mod,
      temp: res.SetTem > 0 ? res.SetTem : undefined,
      fan: res.WdSpd,
    };
  }

  async setState(state: SinclairState): Promise<void> {
    const data: any = {};

    if (state.power !== undefined) data.Pow = state.power ? 1 : 0;
    if (state.mode !== undefined) data.Mod = state.mode;
    if (state.temp !== undefined) data.SetTem = state.temp;
    if (state.fan !== undefined) data.WdSpd = state.fan;

    await this.send({ cmd: 'set', data });
  }

  /* ---------- Protocol ---------- */

  private async handshake(): Promise<void> {
    this.debugLog('Handshake…');

    const res = await this.send({ cmd: 'scan' });

    if (!res?.mac) {
      throw new Error('Handshake failed: no device ID');
    }

    this.deviceId = res.mac;
    this.debugLog(`Device ID: ${this.deviceId}`);
  }

  private async bind(): Promise<void> {
    if (!this.deviceId) {
      throw new Error('Bind failed: no device ID');
    }

    this.debugLog('Binding device…');

    const res = await this.send({
      cmd: 'bind',
      data: {
        mac: this.deviceId,
        key: this.key,
      },
    });

    if (res?.key) {
      this.key = res.key;
      this.debugLog('Session key updated');
    }
  }

  /* ---------- UDP transport ---------- */

  private send(payload: any): Promise<any> {
    if (this.pending) {
      return Promise.reject(new Error('Another request is in flight'));
    }

    return new Promise((resolve, reject) => {
      const encrypted = this.encrypt(payload);
      const msg = Buffer.from(JSON.stringify(encrypted));

      const timeout = setTimeout(() => {
        this.pending = undefined;
        reject(new Error('UDP timeout'));
      }, this.timeoutMs);

      this.pending = { resolve, reject, timeout };

      if (this.debug) {
        this.debugLog(`→ ${JSON.stringify(payload)}`);
      }

      this.socket.send(msg, 0, msg.length, this.port, this.host);
    });
  }

  private onMessage(msg: Buffer) {
    if (!this.pending) {
      return;
    }

    clearTimeout(this.pending.timeout);

    try {
      const raw = JSON.parse(msg.toString());
      const data = this.decrypt(raw);

      if (this.debug) {
        this.debugLog(`← ${JSON.stringify(data)}`);
      }

      this.pending.resolve(data);
    } catch (err) {
      this.pending.reject(err);
    } finally {
      this.pending = undefined;
    }
  }

  /* ---------- Crypto ---------- */

  private encrypt(data: any): any {
    const cipher = crypto.createCipheriv('aes-128-ecb', this.key, null);
    let enc = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    enc += cipher.final('base64');
    return { enc };
  }

  private decrypt(data: any): any {
    const decipher = crypto.createDecipheriv('aes-128-ecb', this.key, null);
    let dec = decipher.update(data.enc, 'base64', 'utf8');
    dec += decipher.final('utf8');
    return JSON.parse(dec);
  }

  private debugLog(msg: string) {
    if (this.debug) {
      this.log(`[DEBUG] ${msg}`);
    }
  }
}
