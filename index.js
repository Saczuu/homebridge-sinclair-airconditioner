//
//  index.js
//
//
//  Created by Maciej Sączewski on 06/02/2026.
//

'use strict';

module.exports = (homebridge) => {
  // Import the platform class
  const SinclairPlatform = require('./platform');

  // The platform module itself handles registration
  // No need to call registerAccessory here
  SinclairPlatform(homebridge);
};
