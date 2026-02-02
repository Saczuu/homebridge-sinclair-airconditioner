import { API } from 'homebridge';
import { SinclairAirconditionerPlatform } from './platform';

// This method must be called by Homebridge to register your plugin
export = (api: API) => {
  // Register the platform with Homebridge
  api.registerPlatform(
    'homebridge-sinclair-airconditioner', // plugin identifier
    'SinclairAirconditioner',             // platform name in config.json
    SinclairAirconditionerPlatform,       // platform class
    true                                  // indicates singular platform
  );
};
