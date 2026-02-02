import { API } from 'homebridge';
import { SinclairAirconditionerPlatform } from './platform';

// This method must be called by Homebridge to register your plugin
export = (api: API) => {
  // Homebridge v1.11.1 does not support the 4th 'singular' argument, so we omit it
  api.registerPlatform(
    'homebridge-sinclair-airconditioner', // plugin identifier (matches package.json)
    'SinclairAirconditioner',             // platform name in config.json
    SinclairAirconditionerPlatform        // platform class
  );
};
