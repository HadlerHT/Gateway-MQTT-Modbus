
# MQTT-Modbus Gateway for Industrial Network Abstraction

## Overview

Welcome to the MQTT-Modbus Gateway project, which integrates legacy Modbus RTU networks into modern IoT ecosystems using the MQTT protocol. This project abstracts Modbus network complexities, allowing clients to interact with Modbus devices without needing in-depth knowledge of the Modbus protocol.

## Project Highlights

- **Modbus to MQTT Conversion**: Translates Modbus requests to MQTT messages and vice versa.
- **Abstracted Data Access**: Simplifies the interaction with Modbus networks, making it easier for clients.
- **Access Control**: Authentication for clients and devices to ensure secure access to topics.
- **Flexible Topic Structure**: Customizable topic structure to handle requests, responses, and network communication.

## Key Technologies

- **Hardware**: ESP32 DevKit, MAX485 for Modbus RTU.
- **Software**: Aedes (JavaScript MQTT broker), MongoDB for user/device management.
- **Testing**: Modrssim2 as the Modbus slave simulator.
- **Programming Languages**: JavaScript (broker), C (ESP32 firmware with ESP-IDF).

## Features

- **High-Level Request Parsing**: Accepts JSON-formatted requests and converts them into Modbus requests.
- **Device Authentication**: Uses a `DBAccess` class to authenticate and manage permissions for clients and devices.
- **Data Logging**: MongoDB stores logins, passwords, and topic permissions for secure access.
- **Topic Structure Flexibility**: Allows for organized communication between clients and devices.

## Valid Request Examples

The following JSON examples demonstrate valid request structures supported by the gateway:

```json
[
    {
        "id": 1,
        "fn": "r",
        "dt": "bi",
        "ls": [0, 1, 5, 7, 8, 9, 15]
    },
    {
        "id": 7,
        "fn": "r",
        "dt": "ni",
        "rg": [16, 25]
    },
    {
        "identifier": 2,
        "function": "read",
        "datatype": "boolean-output",
        "range": [1, 5]
    },
    {
        "id": 1,
        "fn": "r",
        "dt": "no",
        "ls": [21, 8, 11, 10, 9, 1, 2, 4]
    },
    {
        "id": 500,
        "fn": "u",
        "dt": "bo",
        "ls": [1, 2, 3, 4, 10, 11],
        "dv": [1, 0, 1, 0, 1, 0]
    },
    {
        "identifier": 5,
        "function": "write",
        "datatype": "numeric-output",
        "list": [4, 2, 6, 3, 8, 9, 10, 22, 21, 23],
        "values": [2, 1, 0, 15, 33, 2, 102, 7, 11, 7]
    },
    {
        "id": 22,
        "fn": "d",
        "sf": "rqdt"
    }
]
```
## Getting Started

### Prerequisites

1. **ESP32 DevKit** for Modbus-to-MQTT gateway functionality.
2. **MAX485 Module** for Modbus RTU communication.
3. **MongoDB** to store user, client, and device data.
4. **Node.js** (v14 or above) for running the broker.

### Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/HadlerHT/Gateway-MQTT-Modbus.git
   cd Gateway-MQTT-Modbus
   ```

2. **Deploy Firmware to ESP32**

   Using VScode, configure broker uri and wifi credentials on the `MenuConfig`.
   Using ESP-IDF, flash the firmware to the ESP32:

   ```bash
   git checkout gateway-esp32-firmware
   idf.py build flash
   ```
   
3. **Install Broker Dependencies**

   ```bash
   git checkout gateway-broker
   npm install
   ```
   
4. **Setup MongoDB**

   Ensure MongoDB is running and configure access details in `src/app.js`.

5. **Start the Broker**

   ```bash
   node src/app.js
   ```

## Usage

1. **Connect ESP32 to Broker**: The ESP32 will connect over Wi-Fi and listen for MQTT requests.
2. **Send JSON Commands**: Send JSON-formatted requests (like those in the examples) via MQTT to control Modbus devices.
3. **Receive Responses**: Responses from Modbus devices are published back to the specified client topics.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request if you have improvements to propose, particularly in optimization, documentation, or security.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
