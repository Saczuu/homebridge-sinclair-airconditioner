export interface SinclairPlatformConfig {
  name: string;
  devices: DeviceConfig[];
}

export interface DeviceConfig {
  name: string;
  ip: string;
}