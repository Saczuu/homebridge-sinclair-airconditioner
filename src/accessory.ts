import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { SinclairAirConditionerPlatform } from './platform';
import { DeviceConfig } from './types';
import { SinclairApi } from './sinclairApi';

export class SinclairAccessory {
  private service: Service;
  private api: SinclairApi;
  private state = {
    Active: false,
    CurrentTemperature: 22,
    TargetTemperature: 22,
  };

  constructor(
    private readonly platform: SinclairAirConditionerPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly device: DeviceConfig,
  ) {
    // Set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Sinclair')
      .setCharacteristic(this.platform.Characteristic.Model, 'Air Conditioner')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, device.ip);

    // Get or create the HeaterCooler service
    this.service = this.accessory.getService(this.platform.Service.HeaterCooler) ||
      this.accessory.addService(this.platform.Service.HeaterCooler);

    this.service.setCharacteristic(this.platform.Characteristic.Name, device.name);

    // Register handlers for Active characteristic
    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onSet(this.setActive.bind(this))
      .onGet(this.getActive.bind(this));

    // Register handlers for Current Temperature
    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getCurrentTemperature.bind(this));

    // Register handlers for Target Temperature
    this.service.getCharacteristic(this.platform.Characteristic.CoolingThresholdTemperature)
      .onSet(this.setTargetTemperature.bind(this))
      .onGet(this.getTargetTemperature.bind(this));

    // Initialize API connection
    this.api = new SinclairApi({
      host: device.ip,
      logger: this.platform.log,
      onConnected: (deviceState) => {
        this.platform.log.info('Device connected:', device.name, 'at', device.ip);
      },
      onStatus: (deviceState) => {
        this.platform.log.debug('Device status update:', device.name);
      },
      onUpdate: (deviceState) => {
        this.platform.log.debug('Device state updated:', device.name);
      },
      onError: (deviceState) => {
        this.platform.log.error('Device error:', device.name);
      },
      onDisconnected: (deviceState) => {
        this.platform.log.warn('Device disconnected:', device.name);
      },
    });

    this.platform.log.info('Finished initializing accessory:', device.name, 'at', device.ip);
  }

  async setActive(value: CharacteristicValue) {
    this.state.Active = value as boolean;
    this.platform.log.debug('Set Active ->', value, 'for', this.device.name);
    // TODO: Send command to AC unit at this.device.ip
  }

  async getActive(): Promise<CharacteristicValue> {
    this.platform.log.debug('Get Active for', this.device.name);
    // TODO: Get status from AC unit at this.device.ip
    return this.state.Active;
  }

  async getCurrentTemperature(): Promise<CharacteristicValue> {
    this.platform.log.debug('Get Current Temperature for', this.device.name);
    // TODO: Get temperature from AC unit at this.device.ip
    return this.state.CurrentTemperature;
  }

  async setTargetTemperature(value: CharacteristicValue) {
    this.state.TargetTemperature = value as number;
    this.platform.log.debug('Set Target Temperature ->', value, 'for', this.device.name);
    // TODO: Send temperature command to AC unit at this.device.ip
  }

  async getTargetTemperature(): Promise<CharacteristicValue> {
    this.platform.log.debug('Get Target Temperature for', this.device.name);
    // TODO: Get target temperature from AC unit at this.device.ip
    return this.state.TargetTemperature;
  }
}