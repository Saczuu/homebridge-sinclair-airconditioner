import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service } from 'homebridge';
import { SinclairAccessory } from './accessory';
import { SinclairApi } from './sinclairApi';

export class SinclairAirconditionerPlatform implements DynamicPlatformPlugin {
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API
  ) {
    this.api.on('didFinishLaunching', () => {
      this.discoverDevices();
    });
  }

  private discoverDevices() {
    if (!this.config.host) {
      this.log.error('SinclairAirconditioner: No host configured');
      return;
    }

    const accessory = new this.api.platformAccessory(
      this.config.name || 'Sinclair AC',
      this.api.hap.uuid.generate(this.config.host)
    );

    const apiClient = new SinclairApi({
      host: this.config.host,
      debug: this.config.debug
    });

    new SinclairAccessory(accessory, apiClient, this.log);

    this.api.registerPlatformAccessories('homebridge-sinclair-airconditioner', 'SinclairAirconditioner', [accessory]);
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.accessories.push(accessory);
  }
}
