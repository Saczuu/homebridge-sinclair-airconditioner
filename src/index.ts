import { API } from 'homebridge';
import { SinclairPlatform } from './platform';

export = (api: API) => {
  api.registerPlatform(
    'SinclairAirconditioner',
    SinclairPlatform,
  );
};
