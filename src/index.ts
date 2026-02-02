import { API } from 'homebridge';
import { SinclairAirconditionerPlatform } from './platform';

export = (api: API) => {
  api.registerPlatform('homebridge-sinclair-airconditioner', SinclairAirconditionerPlatform);
};
