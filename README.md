# homebridge-sinclair-airconditioner

Homebridge plugin for **Sinclair air conditioners**
using the local **Gree / EWPE (UDP 7000)** protocol.

## Features

- Local control (no cloud)
- Heater / Cooler
- Optional DRY and FAN modes
- Fan speed control
- Homebridge v2 compatible
- HomeKit friendly (single tile)

## Supported devices

- Sinclair TERREL series (tested)
- Other Sinclair models using Gree protocol (untested)

## Installation

```bash
npm install -g homebridge-sinclair-airconditioner
```

Restart Homebridge after installation.

---

## Configuration

Configuration is done via the **Homebridge UI** (no manual JSON editing required).

### Required

* **IP address** of the air conditioner (local network)

### Optional

* Enable **DRY** mode
* Enable **FAN-only** mode
* Polling interval (status refresh rate)

---

## Notes

* This plugin **does NOT rely on device `props`**
* Designed to work with Sinclair devices that:

  * expose the local Gree / EWPE protocol
  * may not be compatible with other Gree-based Homebridge plugins
* Uses a single HomeKit accessory for a clean and native experience

---

## Credits

Inspired by:

* [`ddenisyuk/homebridge-gree-heatercooler`](https://github.com/ddenisyuk/homebridge-gree-heatercooler)
* Community reverse engineering of the **Gree / EWPE** protocol

---
