import { PlatformAccessory, CharacteristicValue, Logger, Service as HBService, API } from 'homebridge';
import { SinclairApi } from './sinclairApi';

export class SinclairAccessory {
  private readonly accessory: PlatformAccessory;
  private readonly apiClient: SinclairApi;
  private readonly log: Logger;
  private service: HBService;

  constructor(accessory: PlatformAccessory, apiClient: SinclairApi, log: Logger, api: API) {
    this.accessory = accessory;
    this.apiClient = apiClient;
    this.log = log;

    // Get Service from api.hap
    this.service = this.accessory.getService(api.hap.Service.HeaterCooler)
      || this.accessory.addService(api.hap.Service.HeaterCooler);

    this.setupAccessory(api);
  }

  private setupAccessory(api: API) {
    const Characteristic = api.hap.Characteristic;

    this.service.getCharacteristic(Characteristic.Active)
      .onSet(this.setActive.bind(this));

    this.service.getCharacteristic(Characteristic.CurrentHeaterCoolerState)
      .onGet(this.getCurrentState.bind(this));

    this.service.getCharacteristic(Characteristic.TargetHeaterCoolerState)
      .onSet(this.setTargetState.bind(this));

    this.service.getCharacteristic(Characteristic.RotationSpeed)
      .onSet(this.setFanSpeed.bind(this));

    this.apiClient.on('connected', () => {
      this.log.info('Connected to Sinclair AC');
    });

    this.apiClient.on('error', (err) => {
      this.log.error('Sinclair API error:', err);
    });
  }

  private async setActive(value: CharacteristicValue) {
    this.apiClient.sendCommand({ cmd: 'set_power', value: value ? 1 : 0 });
  }

  private async setTargetState(value: CharacteristicValue) {
    const modeMap: { [key: number]: string } = {
      0: 'auto',
      1: 'cool',
      2: 'heat',
      3: 'dry',
      4: 'fan'
    };
    const mode = modeMap[value as number] || 'auto';
    this.apiClient.sendCommand({ cmd: 'set_mode', mode });
  }

  private async setFanSpeed(value: CharacteristicValue) {
    this.apiClient.sendCommand({ cmd: 'set_fan', speed: value as number });
  }

  private async getCurrentState(): Promise<CharacteristicValue> {
    return 0; // AUTO default
  }
}
