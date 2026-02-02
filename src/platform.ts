import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service } from 'homebridge';
import { SinclairAccessory } from './accessory';

export class SinclairPlatform implements DynamicPlatformPlugin {
  private readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API
  ) {
    this.api.on('didFinishLaunching', () => {
      this.log('SinclairAirconditioner platform launched');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.accessories.push(accessory);
  }

  private discoverDevices() {
    const name = this.config.name || 'Sinclair AC';
    const host = this.config.host;

    if (!host) {
      this.log.error('Missing host IP for Sinclair AC');
      return;
    }

    const uuid = this.api.hap.uuid.generate(host);
    let accessory = this.accessories.find(a => a.UUID === uuid);

    if (!accessory) {
      accessory = new this.api.platformAccessory(name, uuid);
      new SinclairAccessory(accessory, this.log, host);
      this.api.registerPlatformAccessories('homebridge-sinclair-airconditioner', 'SinclairAirconditioner', [accessory]);
      this.accessories.push(accessory);
    } else {
      new SinclairAccessory(accessory, this.log, host);
    }
  }
}
