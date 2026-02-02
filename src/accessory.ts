import {
  API,
  PlatformAccessory,
  CharacteristicValue,
} from 'homebridge';
import { SinclairApi, SinclairState } from './sinclairApi';

export class SinclairAccessory {
  constructor(
    private readonly accessory: PlatformAccessory,
    private readonly apiClient: SinclairApi,
    private readonly config: any,
    private readonly api: API
  ) {}

  setup(service: any) {
    // Target heater/cooler state
    service
      .getCharacteristic(this.api.hap.Characteristic.TargetHeaterCoolerState)
      .onSet(this.setTargetState.bind(this));

    // Fan speed
    service
      .getCharacteristic(this.api.hap.Characteristic.RotationSpeed)
      .onSet(this.setFanSpeed.bind(this));
  }

  private async setTargetState(value: CharacteristicValue) {
    let mode: number;

    switch (value) {
      case this.api.hap.Characteristic.TargetHeaterCoolerState.COOL:
        mode = 1;
        break;
      case this.api.hap.Characteristic.TargetHeaterCoolerState.HEAT:
        mode = 4;
        break;
      case this.api.hap.Characteristic.TargetHeaterCoolerState.AUTO:
      default:
        mode = 0;
    }

    // Apply optional DRY / FAN modes
    if (mode === 0 && this.config.enableDryMode) mode = 2;
    if (mode === 0 && this.config.enableFanMode) mode = 3;

    await this.apiClient.setState({ mode, power: true });
  }

  private async setFanSpeed(value: CharacteristicValue) {
    const percent = value as number;
    const fan = Math.round((percent / 100) * 5);

    const state: SinclairState = { fan };
    await this.apiClient.setState(state);
  }
}
