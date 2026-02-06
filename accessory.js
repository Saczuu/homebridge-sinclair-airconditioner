//
//  accessory.js
//
//
//  Created by Maciej Sączewski on 06/02/2026.
//

'use strict';

const SinclairAirConditionerFactory = require('./source/SinclairAirConditioner');

module.exports = function (api, log, deviceConfig, Service, Characteristic) {
    // Generate a stable UUID for this device
    const UUID = api.hap.uuid.generate(deviceConfig.name);
    
    // Create the PlatformAccessory
    const platformAccessory = new api.platformAccessory(deviceConfig.name, UUID);
    
    // Create the actual SinclairAirConditioner instance
    const ACClass = SinclairAirConditionerFactory(Service, Characteristic);
    const deviceInstance = new ACClass(log, deviceConfig);
    
    // Store it in the accessory context
    platformAccessory.context.device = deviceInstance;
    
    // Add all services from the device instance
    deviceInstance.getServices().forEach((service, index) => {
        // Always provide a subtype for duplicate UUIDs
        const subtype = service.subtype || `${service.UUID}-${index}`;
        platformAccessory.addService(service, subtype);
    });
    
    return platformAccessory;
};
