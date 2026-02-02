import { PlatformAccessory, CharacteristicValue, Logger, API } from 'homebridge';
import { SinclairApi } from './sinclairApi';

export class SinclairAccessory {
  private service: any;
  private Characteristic: any;

  constructor(
    private accessory: PlatformAccessory,
    private apiClient: SinclairApi,
    private log: Logger,
    private api?: API // optional for v2 support
  ) {
    // Dual v1/v2 Service and Characteristic
    const ServiceValue = this.api?.hap?.Service || require('homebridge').Service;
    this.Characteristic = this.api?.hap?.Characteristic || require('homebridge').Characteristic;

    // Add or get HeaterCooler service
    this.service =
      this.accessory.getService(ServiceValue.HeaterCooler) ||
      this.accessory.addService(ServiceValue.HeaterCooler);

    // Bind characteristics
    this.service.getCharacteristic(this.Characteristic.Active)
      .onSet(this.setActive.bind(this));

    this.service.getCharacteristic(this.Characteristic.CurrentHeaterCoolerState)
      .onGet(this.getCurrentState.bind(this));

    this.service.getCharacteristic(this.Characteristic.TargetHeaterCoolerState)
      .onSet(this.setTargetState.bind(this));

    this.service.getCharacteristic(this.Characteristic.RotationSpeed)
      .onSet(this.setFanSpeed.bind(this));

    // Create a dual-typed log for v1/v2
    const logAny = this.log as unknown as
      | ((msg: string, ...args: any[]) => void)
      | { info?: (msg: string, ...args: any[]) => void; error?: (msg: string, ...args: any[]) => void };

    // Event listeners
    this.apiClient.on('connected', () => {
      if (typeof logAny === 'function') {
        logAny('Connected to Sinclair AC');
      } else {
        logAny?.info?.('Connected to Sinclair AC');
      }
    });

    this.apiClient.on('error', (err) => {
      if (typeof logAny === 'function') {
        logAny('Sinclair API error:', err);
      } else {
        logAny?.error?.('Sinclair API error:', err);
      }
    });
  }

  private async setActive(value: CharacteristicValue) {
    await this.apiClient.sendCommand({ cmd: 'set_power', value: value ? 1 : 0 });
  }

  private async setTargetState(value: CharacteristicValue) {
    const modeMap: { [key: number]: string } = {
      0: 'auto', // AUTO
      1: 'cool', // COOL
      2: 'heat', // HEAT
      3: 'dry',  // DRY
      4: 'fan'   // FAN
    };
    const mode = modeMap[value as number] || 'auto';
    await this.apiClient.sendCommand({ cmd: 'set_mode', mode });
  }

  private async setFanSpeed(value: CharacteristicValue) {
    await this.apiClient.sendCommand({ cmd: 'set_fan', speed: value as number });
  }

  private async getCurrentState(): Promise<CharacteristicValue> {
    // Could map real API state here; default to AUTO
    return 0;
  }
}
