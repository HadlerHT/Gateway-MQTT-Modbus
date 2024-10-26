# MQTT-Modbus Gateway

This project implements an MQTT-Modbus gateway aimed at integrating Modbus networks with Internet of Things (IoT) applications. The system allows users to control and monitor Modbus devices without requiring specific protocol knowledge, utilizing JSON-formatted messages over MQTT.

## Features

- **Modbus Abstraction**: Receives JSON requests and converts them into Modbus commands, simplifying communication between IoT devices and industrial networks.
- **Access Control**: User and device authentication via MongoDB, with configurable access restrictions by MQTT topics.
- **Device Management**: Compatible with ESP32 and Modbus RTU network configurations.

## Project Structure

- **MQTT Broker**: Implemented in JavaScript using the `Aedes` package, with support for permission management.
- **DBAccess**: Class for managing MongoDB connections, responsible for authentication and access control.
- **ESP32 Gateway**: Firmware written in C with ESP-IDF, operating as a bridge between Modbus RTU and Modbus over MQTT.

## Prerequisites

- Node.js and NPM
- MongoDB
- ESP32 with ESP-IDF
- Modrssim2 software for testing as Modbus slave (optional)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/repo-name.git
   cd repo-name
   ```

2. Install MQTT broker dependencies:
   ```bash
   npm install
   ```

3. Set up MongoDB with user, device, and permission data.

4. Compile and install the firmware on the ESP32 using ESP-IDF.

## Usage

- **Start the Broker**:
  ```bash
  node broker.js
  ```

- **Send Modbus Requests via MQTT**:
  Use any MQTT client to send JSON messages to specific topics configured for the gateway.

## License

This project is licensed under the [MIT License](LICENSE).
