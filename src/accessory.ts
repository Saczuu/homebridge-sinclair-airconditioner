import { PlatformAccessory, Service, CharacteristicValue, Logger } from 'homebridge';
import { SinclairAPI, DeviceState } from './sinclairApi';

export class SinclairAccessory {
  private service: Service;
  private api: SinclairAPI;

  constructor(
    private readonly accessory: PlatformAccessory,
    private readonly log: Logger,
    host: string
  ) {
    this.service =
      this.accessory.getService(Service.HeaterCooler) ||
      this.accessory.addService(Service.HeaterCooler);

    this.service.setCharacteristic(Service.Characteristic.Name, accessory.displayName);

    this.api = new SinclairAPI({ host });

    this.api.on('connected', (device: DeviceState) => {
      this.log(`Connected to Sinclair AC: ${device.name}`);
      this.updateCharacteristics();
    });

    this.api.on('status', () => this.updateCharacteristics());
    this.api.on('update', () => this.updateCharacteristics());
    this.api.on('error', err => this.log('Sinclair API error:', err));

    this.configureCharacteristics();
  }

  private configureCharacteristics() {
    // Active On/Off
    this.service
      .getCharacteristic(Service.Characteristic.Active)
      .onSet(this.setActive.bind(this))
      .onGet(this.getActive.bind(this));

    // Current / Target HeaterCooler state
    this.service
      .getCharacteristic(Service.Characteristic.CurrentHeaterCoolerState)
      .onGet(this.getCurrentState.bind(this));

    this.service
      .getCharacteristic(Service.Characteristic.TargetHeaterCoolerState)
      .onSet(this.setTargetState.bind(this))
      .onGet(this.getTargetState.bind(this));

    // Rotation speed / fan
    this.service
      .getCharacteristic(Service.Characteristic.RotationSpeed)
      .onSet(this.setFanSpeed.bind(this))
      .onGet(this.getFanSpeed.bind(this));
  }

  private updateCharacteristics() {
    const device = this.api.getDevice();

    // Active
    this.service.updateCharacteristic(
      Service.Characteristic.Active,
      device.props['power'] ? 1 : 0
    );

    // Current / Target state
    const mode = device.props['mode'];
    let state = Service.Characteristic.CurrentHeaterCoolerState.INACTIVE;
    let target = Service.Characteristic.TargetHeaterCoolerState.AUTO;

    if (mode === 1) {
      state = Service.Characteristic.CurrentHeaterCoolerState.HEAT;
      target = Service.Characteristic.TargetHeaterCoolerState.HEAT;
    } else if (mode === 2) {
      state = Service.Characteristic.CurrentHeaterCoolerState.COOL;
      target = Service.Characteristic.TargetHeaterCoolerState.COOL;
    }

    this.service.updateCharacteristic(
      Service.Characteristic.CurrentHeaterCoolerState,
      state
    );
    this.service.updateCharacteristic(
      Service.Characteristic.TargetHeaterCoolerState,
      target
    );

    // Fan speed
    this.service.updateCharacteristic(
      Service.Characteristic.RotationSpeed,
      device.props['fanSpeed'] || 0
    );
  }

  // Characteristic handlers
  async setActive(value: CharacteristicValue) {
    this.api.setPower(value === 1);
  }

  async getActive(): Promise<CharacteristicValue> {
    return this.api.getPower() ? 1 : 0;
  }

  async setTargetState(value: CharacteristicValue) {
    const mode = value === Service.Characteristic.TargetHeaterCoolerState.HEAT ? 1 : 2;
    this.api.setMode(mode);
  }

  async getTargetState(): Promise<CharacteristicValue> {
    const mode = this.api.getMode();
    return mode === 1
      ? Service.Characteristic.TargetHeaterCoolerState.HEAT
      : Service.Characteristic.TargetHeaterCoolerState.COOL;
  }

  async getCurrentState(): Promise<CharacteristicValue> {
    const mode = this.api.getMode();
    return mode === 1
      ? Service.Characteristic.CurrentHeaterCoolerState.HEAT
      : Service.Characteristic.CurrentHeaterCoolerState.COOL;
  }

  async setFanSpeed(value: CharacteristicValue) {
    this.api.setFanSpeed(Number(value));
  }

  async getFanSpeed(): Promise<CharacteristicValue> {
    return this.api.getFanSpeed();
  }
}
