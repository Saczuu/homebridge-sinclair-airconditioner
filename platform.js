//
//  platform.js
//  
//
//  Created by Maciej Sączewski on 06/02/2026.
//

'use strict';

const SinclairAirConditionerFactory = require('./accessory');

let Service, Characteristic;

class SinclairAirConditionerPlatform {
    constructor(log, config, api) {
        this.log = log;
        this.config = config || {};
        this.api = api;
        this.accessories = []; // store all registered accessories

        Service = api.hap.Service;
        Characteristic = api.hap.Characteristic;

        log.info('[Sinclair ACs] Initializing SinclairPlatform platform...');

        // Start discovery once Homebridge is ready
        if (api) {
            this.api.on('didFinishLaunching', () => {
                this.discoverDevices();
            });
        }
    }

    /**
     * Homebridge calls this to restore cached accessories
     */
    configureAccessory(accessory) {
        this.accessories.push(accessory);
    }

    /**
     * Discover AC devices from config
     */
    discoverDevices() {
        const devices = Array.isArray(this.config.devices) ? this.config.devices : [];
        if (!devices.length) {
            this.log.warn('[Sinclair ACs] No devices found in config.');
            return;
        }

        devices.forEach((acConfig) => {
            try {
                const name = acConfig.name || 'Sinclair AC';
                this.log.info(`[Sinclair ACs] Start discover device ${acConfig.host}`);

                // Create the accessory wrapper
                const platformAccessory = SinclairAirConditionerFactory(
                    this.api,
                    this.log,
                    acConfig,
                    Service,
                    Characteristic
                );

                // Save reference for possible removal later
                this.accessories.push(platformAccessory);

                // Register accessory with Homebridge
                this.api.registerPlatformAccessories(
                    'homebridge-sinclair-airconditioner',
                    'SinclairPlatform',
                    [platformAccessory]
                );

            } catch (err) {
                this.log.error('[Sinclair ACs] Failed to initialize AC', acConfig.host, err);
            }
        });
    }

    /**
     * Optional: remove accessories if config changes
     */
    removeAccessories() {
        if (!this.accessories.length) return;
        this.api.unregisterPlatformAccessories(
            'homebridge-sinclair-airconditioner',
            'SinclairPlatform',
            this.accessories
        );
        this.accessories = [];
    }
}

module.exports = (homebridge) => {
    homebridge.registerPlatform(
        'homebridge-sinclair-airconditioner',
        'SinclairPlatform',
        SinclairAirConditionerPlatform,
        true // dynamic platform
    );
};
