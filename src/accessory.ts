import { PlatformAccessory, Service, CharacteristicValue, Logger } from 'homebridge';
import { SinclairApi } from './sinclairApi';

export class SinclairAccessory {
  private readonly accessory: PlatformAccessory;
  private readonly apiClient: SinclairApi;
  private readonly log: Logger;

  constructor(accessory: PlatformAccessory, apiClient: SinclairApi, log: Logger) {
    this.accessory = accessory;
    this.apiClient = apiClient;
    this.log = log;

    this.setupAccessory();
  }

  private setupAccessory() {
    const service = this.accessory.getService(Service.HeaterCooler)
      || this.accessory.addService(Service.HeaterCooler);

    service.getCharacteristic(Service.Characteristic.Active)
      .onSet(this.setActive.bind(this));

    service.getCharacteristic(Service.Characteristic.CurrentHeaterCoolerState)
      .onGet(this.getCurrentState.bind(this));

    service.getCharacteristic(Service.Characteristic.TargetHeaterCoolerState)
      .onSet(this.setTargetState.bind(this));

    service.getCharacteristic(Service.Characteristic.RotationSpeed)
      .onSet(this.setFanSpeed.bind(this));

    this.apiClient.on('connected', () => {
      this.log('Connected to Sinclair AC');
    });

    this.apiClient.on('error', (err) => {
      this.log('Sinclair API error:', err);
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
    // This could be enhanced to read last known state
    return 0; // AUTO default
  }
}
