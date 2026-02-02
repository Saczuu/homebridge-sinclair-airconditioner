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
    private readonly api: API
  ) {
    // After Homebridge starts, discover AC
    this.api.on('didFinishLaunching', () => {
      this.discover();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    // Cache restored accessories
    this.accessories.push(accessory);
  }

  private async discover() {
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
      this.log.info('Created new accessory for Sinclair AC');
    } else {
      this.log.info('Restored cached accessory for Sinclair AC');
    }

    // Create or get HeaterCooler service
    const service =
      accessory.getService(this.api.hap.Service.HeaterCooler) ||
      accessory.addService(this.api.hap.Service.HeaterCooler);

    // Initialize API client safely
    const apiClient = new SinclairApi(
      this.config.host,
      this.log.info.bind(this.log),
      this.config.debug
    );

    try {
      await apiClient.init();
    } catch (err) {
      this.log.error('Failed to connect to Sinclair AC:', err);
      return; // Do not crash Homebridge
    }

    // Setup accessory logic
    const sinclair = new SinclairAccessory(accessory, apiClient, this.config, this.api);
    sinclair.setup(service);

    // Start polling
    this.startPolling(service, apiClient);
  }

  private startPolling(service: Service, apiClient: SinclairApi) {
    const interval = (this.config.pollingInterval || 10) * 1000;

    setInterval(async () => {
      try {
        const state = await apiClient.getStatus();

        if (state.temp !== undefined) {
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

        const currentState = this.mapModeToHap(state.mode ?? 0);
        service.updateCharacteristic(
          this.api.hap.Characteristic.CurrentHeaterCoolerState,
          currentState
        );
      } catch (err) {
        this.log.warn('Polling error:', err);
      }
    }, interval);
  }

  private mapModeToHap(mode: number): number {
    const Characteristic = this.api.hap.Characteristic;
    switch (mode) {
      case 1: return Characteristic.CurrentHeaterCoolerState.COOLING;
      case 4: return Characteristic.CurrentHeaterCoolerState.HEATING;
      case 2:
      case 3: return Characteristic.CurrentHeaterCoolerState.IDLE;
      default: return Characteristic.CurrentHeaterCoolerState.INACTIVE;
    }
  }
}
