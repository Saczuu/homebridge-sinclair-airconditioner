import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
} from 'homebridge';
import { SinclairAccessory } from './accessory';
import { SinclairApi } from './sinclairApi';

export class SinclairAirconditionerPlatform implements DynamicPlatformPlugin {
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API
  ) {
    // v1/v2 compatible log
    const logAny = this.log as unknown as
      | ((msg: string, ...args: any[]) => void)
      | { info?: (msg: string, ...args: any[]) => void; error?: (msg: string, ...args: any[]) => void };

    this.api.on('didFinishLaunching', () => {
      if (typeof logAny === 'function') {
        logAny('SinclairAirconditioner: Finished launching');
      } else {
        logAny?.info?.('SinclairAirconditioner: Finished launching');
      }

      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.accessories.push(accessory);
  }

  private discoverDevices() {
    if (!this.config.host) {
      const logAny = this.log as unknown as
        | ((msg: string, ...args: any[]) => void)
        | { info?: (msg: string, ...args: any[]) => void; error?: (msg: string, ...args: any[]) => void };

      if (typeof logAny === 'function') {
        logAny('SinclairAirconditioner: No host configured');
      } else {
        logAny?.error?.('SinclairAirconditioner: No host configured');
      }
      return;
    }

    const uuid = this.api.hap.uuid.generate(this.config.host);

    const accessory = new this.api.platformAccessory(
      this.config.name || 'Sinclair AC',
      uuid
    );

    // Create API client
    const apiClient = new SinclairApi({
      host: this.config.host,
      debug: this.config.debug,
    });

    // Pass log to accessory for v1/v2 compatibility
    new SinclairAccessory(accessory, apiClient, this.log, this.api);

    // Register accessory
    this.api.registerPlatformAccessories(
      'homebridge-sinclair-airconditioner',
      'SinclairAirconditioner',
      [accessory]
    );
  }
}
