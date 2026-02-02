import { API, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { SinclairApi, SinclairState } from './sinclairApi';

export class SinclairAccessory {
  constructor(
    private readonly accessory: PlatformAccessory,
    private readonly apiClient: SinclairApi,
    private readonly config: any,
    private readonly api: API
  ) {}

  setup(service: any) {
    // Target HeaterCooler State
    service
      .getCharacteristic(this.api.hap.Characteristic.TargetHeaterCoolerState)
      .onSet(this.setTargetState.bind(this));

    // Fan speed
    service
      .getCharacteristic(this.api.hap.Characteristic.RotationSpeed)
      .onSet(this.setFanSpeed.bind(this));

    // Initial values
    this.refreshCurrentState(service);
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

    if (mode === 0 && this.config.enableDryMode) mode = 2;
    if (mode === 0 && this.config.enableFanMode) mode = 3;

    try {
      await this.apiClient.setState({ mode, power: true });
    } catch (err) {
      this.accessory.log?.('Failed to set mode:', err);
    }
  }

  private async setFanSpeed(value: CharacteristicValue) {
    const percent = value as number;
    const fan = Math.round((percent / 100) * 5);

    const state: SinclairState = { fan };
    try {
      await this.apiClient.setState(state);
    } catch (err) {
      this.accessory.log?.('Failed to set fan speed:', err);
    }
  }

  private async refreshCurrentState(service: any) {
    try {
      const state = await this.apiClient.getStatus();

      if (state.temp !== undefined) {
        service.updateCharacteristic(
          this.api.hap.Characteristic.CurrentTemperature,
          state.temp
        );
      }

      const currentState = this.mapModeToHap(state.mode);
      service.updateCharacteristic(
        this.api.hap.Characteristic.CurrentHeaterCoolerState,
        currentState
      );
    } catch (err) {
      this.accessory.log?.('Failed to refresh state:', err);
    }
  }

  private mapModeToHap(mode: number): number {
    const Characteristic = this.api.hap.Characteristic;
    switch (mode) {
      case 1: return Characteristic.CurrentHeaterCoolerState.COOLING;
      case 4: return Characteristic.CurrentHeaterCoolerState.HEATING;
      case 2:
      case 3: return Characteristic.CurrentHeaterCoolerState.IDLE;
      default: return Characteristic.CurrentH
