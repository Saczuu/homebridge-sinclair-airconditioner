//
//  index.js
//
//
//  Created by Maciej Sączewski on 06/02/2026.
//

const SinclairAirConditionerFactory = require('./source/SinclairAirConditioner');

module.exports = function (homebridge) {
  const Service = homebridge.hap.Service;
  const Characteristic = homebridge.hap.Characteristic;

  const SinclairAirConditioner =
    SinclairAirConditionerFactory(Service, Characteristic);

  homebridge.registerAccessory(
    'homebridge-sinclair-airconditioner',
    'SinclairAirConditioner',
    SinclairAirConditioner
  );
};
