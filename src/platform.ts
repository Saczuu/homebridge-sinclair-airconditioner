import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
} from 'homebridge';
import { SinclairApi } from './sinclairApi';
import { SinclairAccessory } from './accessory';

export class SinclairPlatform implements DynamicPlatformPlugin {
  private accessories: PlatformAccessory[] = [];

  constructor(
    private readonly log: Logger,
    private readonly config: any,
    private readonly api: API
  ) {
    this.api.on('didFinishLaunching', () => {
      this.discover();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.accessories.push(accessory);
  }

  async discover() {
    const uuid = this.api.hap.uuid.generate(`sinclair-${this.config.host}`);
    let accessory = this.accessories.find(a => a.UUID === uuid);

    if (!accessory) {
      accessory = new this.api.platformAccessory(
        this.config.name || 'Air Conditioner',
        uuid
      );
      this.api.registerPlatformAccessories(
        'homebridge-sinclair-airconditioner',
        'SinclairAirconditioner',
        [accessory]
      );
    }

    // Get or create HeaterCooler service
    const service =
      accessory.getService(this.api.hap.Service.HeaterCooler) ||
      accessory.addService(this.api.hap.Service.HeaterCooler);

    const apiClient = new SinclairApi(
      this.config.host,
      this.log.info.bind(this.log),
      this.config.debug
    );

    await apiClient.init();

    const sinclair = new SinclairAccessory(
      accessory,
      apiClient,
      this.config,
      this.api
    );
    sinclair.setup(service);

    this.startPolling(service, apiClient);
  }

  private startPolling(service: any, apiClient: SinclairApi) {
    const interval = (this.config.pollingInterval || 10) * 1000;

    setInterval(async () => {
      try {
        const state = await apiClient.getStatus();

        if (state.temp && state.temp >= 16) {
          service.updateCharacteristic(
            this.api.hap.Characteristic.CurrentTemperature,
            state.temp
          );
        }

        if (state.fan !== undefined) {
          service.updateCharacteristic(
            this.api.hap.Characteristic.RotationSpeed,
            Math.round((state.fan / 5) * 100)
          );
        }
      } catch (err) {
        this.log.warn('Polling error:', err);
      }
    }, interval);
  }
}
