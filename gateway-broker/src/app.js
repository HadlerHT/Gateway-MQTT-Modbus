/**
 * @file app.js
 * @description Main entry point for initializing and launching the Gateway application.
 *              This application functions as a Modbus-MQTT gateway, processing incoming MQTT
 *              messages, validating requests, and facilitating communication with Modbus devices.
 * 
 * @module App
 * 
 * @requires ./core/gateway - The main Gateway class responsible for handling MQTT messages
 *                             and relaying them to Modbus devices.
 * 
 * @example
 * // Start the Gateway application with a MongoDB URI
 * const gateway = new Gateway('mongodb://brokerUser:brokerPassword@localhost:27017/broker');
 * gateway.start();
 * 
 * @see Gateway for further documentation on core functionality.
 */

// Import the Gateway class from the core module
const Gateway = require('./core/gateway.js');

/**
 * MongoDB URI for broker authentication and data storage.
 * Replace `brokerUser` and `brokerPassword` with actual credentials for production environments.
 * @type {string}
 */
const dbUri = 'mongodb://brokerUser:brokerPassword@localhost:27017/broker';

/**
 * Instantiate the Gateway with the specified database URI.
 * @constant {Gateway} gateway - The primary gateway instance responsible for managing application logic.
 */
const gateway = new Gateway(dbUri);

/**
 * Initialize and start the gateway service.
 * This method activates the MQTT broker, sets up request handling,
 * manages device communication, and enables other core functionalities.
 */
gateway.start();
