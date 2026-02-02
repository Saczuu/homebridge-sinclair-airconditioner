import { PlatformAccessory, CharacteristicValue, Logger, API } from 'homebridge';
import { SinclairApi } from './sinclairApi';

export class SinclairAccessory {
  private service: any;

  constructor(
    private accessory: PlatformAccessory,
    private apiClient: SinclairApi,
    private log: Logger,
    private api?: API // optional for v1 fallback
  ) {
    // Support v1/v2 Service and Characteristic
    const ServiceValue = this.api?.hap?.Service || require('homebridge').Service;
    const CharacteristicValue = this.api?.hap?.Characteristic || require('homebridge').Characteristic;

    this.service =
      this.accessory.getService(ServiceValue.HeaterCooler) ||
      this.accessory.addService(ServiceValue.HeaterCooler);

    this.service.getCharacteristic(CharacteristicValue.Active)
      .onSet(this.setActive.bind(this));

    this.service.getCharacteristic(CharacteristicValue.CurrentHeaterCoolerState)
      .onGet(this.getCurrentState.bind(this));

    this.service.getCharacteristic(CharacteristicValue.TargetHeaterCoolerState)
      .onSet(this.setTargetState.bind(this));

    this.service.getCharacteristic(CharacteristicValue.RotationSpeed)
      .onSet(this.setFanSpeed.bind(this));

    this.apiClient.on('connected', () => {
      if (typeof this.log === 'function') this.log('Connected to Sinclair AC');
      else this.log?.info('Connected to Sinclair AC');
    });

    this.apiClient.on('error', (err) => {
      if (typeof this.log === 'function') this.log('Sinclair API error:', err);
      else this.log?.error('Sinclair API error:', err);
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
    return 0; // default AUTO
  }
}
