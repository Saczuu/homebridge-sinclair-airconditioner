import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  Service,
} from 'homebridge';
import { SinclairApi } from './sinclairApi';
import { SinclairAccessory } from './accessory';

export class SinclairPlatform implements DynamicPlatformPlugin {
  private accessories: PlatformAccessory[] = [];

  constructor(
    private readonly log: Logger,
    private readonly config: any,
    private readonly api: API,
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
        this.config.name || 'Klimatyzacja',
        uuid,
      );
      this.api.registerPlatformAccessories(
        'homebridge-sinclair-airconditioner',
        'SinclairAirconditioner',
        [accessory],
      );
    }

    const service =
      accessory.getService(Service.HeaterCooler) ||
      accessory.addService(Service.HeaterCooler);

    const apiClient = new SinclairApi(this.config.host, this.log.info.bind(this.log));
    await apiClient.init();

    const sinclair = new SinclairAccessory(accessory, apiClient, this.config);
    sinclair.setup(service);

    this.startPolling(service, apiClient);
  }

  private startPolling(service: Service, apiClient: SinclairApi) {
    setInterval(async () => {
      try {
        const state = await apiClient.getStatus();

        if (state.temp && state.temp >= 16) {
          service.updateCharacteristic(
            this.api.hap.Characteristic.CurrentTemperature,
            state.temp,
          );
        }

        if (state.fan !== undefined) {
          service.updateCharacteristic(
            this.api.hap.Characteristic.RotationSpeed,
            Math.round((state.fan / 5) * 100),
          );
        }
      } catch (err) {
        this.log.warn('Polling error:', err);
      }
    }, (this.config.pollingInterval || 10) * 1000);
  }
}
