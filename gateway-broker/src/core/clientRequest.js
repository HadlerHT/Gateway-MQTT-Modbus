/**
 * ClientRequest - Manages Client-Side Modbus Requests in MQTT-Modbus Gateway
 * ----------------------------------------------------------------------------
 * 
 * This class represents a client request within the MQTT to Modbus gateway, handling:
 * - Parsing and structuring client commands into Modbus-compatible formats.
 * - Buffering and packetizing requests for device transmission.
 * - Processing and formatting device responses for the client, including error handling.
 * 
 * Key Functionalities:
 * - **Request Parsing and Validation**: Uses `requestFormatter` to format incoming JSON client requests to Modbus.
 * - **Buffering and Packetizing**: Converts parsed data to Modbus packets, bufferizes them for transmission,
 *   and handles the debuffering of responses for client readability.
 * - **Error Handling and Response Management**: Identifies and manages errors, timeouts, and validation issues,
 *   providing structured feedback to the client.
 *
 * Dependencies:
 * - `@validator/requestFormatter`: Parses and validates incoming client JSON requests for Modbus compatibility.
 * - `@parser/modbusRequestEncoder`: Encodes parsed data into Modbus-compatible packets.
 * - `@parser/modbusPacketBufferizer` and `@parser/modbusResponseDebufferizer`: Bufferize and debufferize packets
 *   to meet Modbus format requirements.
 * - `@maps/keywordsMap`: Provides standard fields (`mb.STATUS`, `mb.MESSAGE`) for response structure.
 *
 * Usage in TCC System:
 * 1. `ClientRequest` instances are created when a validated client request is received.
 * 2. Methods like `pushResponse`, `errorResponse`, and `processClientResponse` manage Modbus response handling.
 *
 * Example:
 * -----------
 * const request = new ClientRequest(content, format, client, device);
 * request.processClientResponse(false); // Process response on success or timeout
 *
 * Author: TEMPESTA, H. H.
 * Date: Oct 31st 2024
 */

require('module-alias/register');
const { requestFormatter }          = require('@validator/requestFormatter')
const { RequestFormatter }          = require('@validator/requestFormatter')
const ModbusPacketConstructor       = require('@parser/modbusRequestEncoder')
const ModbusPacketBufferizer        = require('@parser/modbusPacketBufferizer')
const ModbusResponseDebufferizer    = require('@parser/modbusResponseDebufferizer')
const ModbusResponseDecoder         = require('@parser/modbusResponseDecoder')
const { mb }                        = require('@maps/keywordsMap');

class ClientRequest {

    constructor(content, format, client, device) {

        this.originalContent = content
        this.originalformat = format

        this.content = requestFormatter.parse(content, format);
        this.client = client;
        this.device = device;

        this.parsedRequests = ModbusPacketConstructor.parse(this.content);
        this.bufferRequests = this.parsedRequests.map((parsedPacket) => ModbusPacketBufferizer.toBuffer(parsedPacket, this.content))

        this.bufferResponses = [];
        this.responseObject = null;
    }

    pushResponse(response) {
        this.bufferResponses.push(response.slice(1));
    }

    errorResponse(message = null) {
        const responseObject = JSON.parse(JSON.stringify(this.content));
        responseObject[mb.STATUS] = false;
        if (message) {
            responseObject[mb.MESSAGE] = message;
        }

        return responseObject;
    }

    processClientResponse(hasTimedOut) {
        if (hasTimedOut) {
            this.errorResponse('Timed Out');
            return;
        }

        const parsedResponses = this.bufferResponses.some(buffer => buffer.equals(ModbusResponseDebufferizer.nullBuffer))
            ? [null]
            : ModbusResponseDebufferizer.toArray(this);

        this.responseObject = parsedResponses.includes(null)
            ? this.errorResponse('Error Retrieving Data')
            : ModbusResponseDecoder.createClientResponse(this, parsedResponses);

        this.responseObject = RequestFormatter.correctFormat(this.responseObject, this.originalContent, this.originalformat);
    }
}

module.exports = ClientRequest

