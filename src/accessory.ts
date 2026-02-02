import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { SinclairApi } from './sinclairApi';

export class SinclairAccessory {
  constructor(
    private readonly accessory: PlatformAccessory,
    private readonly api: SinclairApi,
    private readonly config: any,
  ) {}

  setup(service: Service) {
    service
      .getCharacteristic(this.accessory.platform.Characteristic.TargetHeaterCoolerState)
      .onSet(this.setTargetState.bind(this));

    service
      .getCharacteristic(this.accessory.platform.Characteristic.RotationSpeed)
      .onSet(this.setFanSpeed.bind(this));
  }

  private async setTargetState(value: CharacteristicValue) {
    let mode: number;

    switch (value) {
      case this.accessory.platform.Characteristic.TargetHeaterCoolerState.COOL:
        mode = 1;
        break;
      case this.accessory.platform.Characteristic.TargetHeaterCoolerState.HEAT:
        mode = 4;
        break;
      case this.accessory.platform.Characteristic.TargetHeaterCoolerState.AUTO:
      default:
        mode = 0;
    }

    // Jeśli AUTO i DRY włączony → użyj DRY
    if (mode === 0 && this.config.enableDryMode) {
      mode = 2;
    }

    // Jeśli AUTO i FAN włączony → FAN
    if (mode === 0 && this.config.enableFanMode) {
      mode = 3;
    }

    await this.api.setState({ mode, power: true });
  }

  private async setFanSpeed(value: CharacteristicValue) {
    const percent = value as number;
    const fan = Math.round((percent / 100) * 5);

    await this.api.setState({ fan });
  }
}
