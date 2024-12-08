/**
 * Gateway - MQTT to Modbus Gateway Class for Industrial IoT Systems
 * ------------------------------------------------------------------
 * 
 * This class bridges MQTT and Modbus protocols, enabling high-level client interactions with Modbus devices
 * without requiring direct knowledge of Modbus. It uses an MQTT broker for message handling and a request queue
 * to manage client requests and device responses, integrating validation, parsing, and response management.
 *
 * Key Components:
 * - **MQTT Broker**: Utilizes `MQTTBroker` to handle MQTT communications and manage client connections.
 * - **Request Queue**: Manages `ClientRequest` objects, including validation and buffering for Modbus requests
 *   and debuffering responses back to the client.
 * - **Client Request Handling**: Validates client requests, parses them to Modbus-compatible packets, and buffers
 *   them for device transmission; collects responses for each request, handling errors and timeouts as needed.
 *
 * Key Functionalities:
 * - **setupCallbacks**: Registers the callback functions to handle incoming MQTT messages from clients/devices,
 *   validate requests, and enqueue them for processing.
 * - **start**: Initializes the MQTT broker and prepares the system for client and device interactions.
 * - **Error Handling & Feedback**: Responds to clients with error messages if validation fails and logs device
 *   responses for monitoring.
 *
 * Dependencies:
 * - `@core/broker.js`: MQTT broker for managing client subscriptions, publishing responses, and session handling.
 * - `@core/queue.js`: Queue manager for ordered processing of client requests and Modbus responses.
 * - `@core/clientRequest.js`: Encapsulates client request information and processes responses from devices.
 * - `@validator/requestValidator.js`: Validates requests against a predefined schema for format and content.
 * - `@maps/keywordsMap.js`: Map of standard field names (e.g., `mb.MESSAGE`, `mb.ALLOWED_VALUES`) for consistent
 *   message structures across the system.
 *
 * Usage:
 * 1. Instantiate `Gateway` with database URI and optionally, the MQTT port.
 * 2. Call `start()` to launch the MQTT broker and begin handling requests.
 * 
 * Example:
 * -----------
 * const Gateway = require('./path/to/Gateway');
 * const gateway = new Gateway('mongodb://localhost:27017/mydb');
 * gateway.start();
 *
 * Author: TEMPESTA, H. H.
 * Date: Oct 31st 2024
 */

require('module-alias/register');
const MQTTBroker        = require('@core/broker.js');
const RequestQueue      = require('@core/queue.js');
const ClientRequest     = require('@core/clientRequest.js');
const { validator }     = require('@validator/requestValidator.js');
const { mb, getKey }    = require('@maps/keywordsMap.js');

class Gateway {
    /**
     * Initializes the Gateway class, setting up the MQTT broker and request queue.
     * @param {string} dbUri - URI for connecting to the MongoDB database.
     * @param {number} [mqttPort=1883] - Port to use for the MQTT broker.
     */
    constructor(dbUri, mqttPort=1883) {
        this.broker = new MQTTBroker(dbUri, mqttPort);
        this.requestQueue = new RequestQueue();
        this.setupCallbacks();
    }

    /**
     * Sets up message handling callbacks for MQTT messages and device responses.
     * Registers:
     * - Client request handling, including validation and queuing.
     * - Device response handling for processing Modbus responses.
     */
    setupCallbacks() {
        this.broker.onMessage((topic, payload) => {
            let [client, device, operator] = topic.split("/");

            if (operator === 'request') {
                try { 
                    payload = JSON.parse(payload); 
                } catch (error) { 
                    payload = {}; 
                }

                if (validator.validate(payload)) {
                    const clientRequest = new ClientRequest(payload, validator.result.format, client, device); 
                    console.log('\x1b[34m%s\x1b[0m', '[Client Request]', `${client} ---> ${device}`, JSON.stringify(clientRequest.content));
                    this.requestQueue.enqueue(clientRequest);
                } 
                else {                    
                    payload[getKey(mb.MESSAGE, validator.result.format)] = validator.result.msg;
                    if (validator.result.hasOwnProperty('allowedValues')) {
                        payload[getKey(mb.ALLOWED_VALUES, validator.result.format)] = validator.result.allowedValues;    
                    }

                    this.broker.publish(`${client}/${device}/response`, payload);
                }
            } 
            else if (operator === 'mbnet') {
                console.log('\x1b[35m%s\x1b[0m', '[Device Echo]', `${device}`, Buffer.from(payload).slice(1));
                this.requestQueue.items[0].pushResponse(Buffer.from(payload));
            }
        });

        this.requestQueue.postToDeviceCallback = (client, device, bufferizedPacket) => {
            this.broker.publish(`${client}/${device}/mbnet`, bufferizedPacket);
        };

        this.requestQueue.postToClientCallback = (request) => {
            this.broker.publish(`${request.client}/${request.device}/response`, request.responseObject);
        };
    }

    /**
     * Starts the MQTT broker, enabling the Gateway to handle incoming messages.
     */
    start() {
        this.broker.start();
    }
}

module.exports = Gateway;
