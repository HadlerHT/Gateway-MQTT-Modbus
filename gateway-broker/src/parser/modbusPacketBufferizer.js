/**
 * ModbusPacketBufferizer - Buffers Modbus Requests for MQTT-Modbus Gateway
 * --------------------------------------------------------------------------
 * 
 * This module contains classes that handle buffering for various types of Modbus requests,
 * including reading, writing, diagnostic, and raw Modbus commands. Each type of request
 * is converted into a buffer format suitable for Modbus transmission.
 * 
 * Key Components:
 * - **IORequestBufferizer**: Base class that provides a method for converting parsed packets into buffers.
 * - **ReadingRequestBufferizer**: Buffers Modbus reading requests.
 * - **WritingRequestBufferizer**: Buffers Modbus writing requests, handling both numeric and boolean outputs.
 * - **DiagnosisRequestBufferizer**: Buffers diagnostic requests for Modbus.
 * - **RawModbusRequestBufferizer**: Buffers raw Modbus requests without additional processing.
 * - **ModbusPacketBufferizer**: Main class used to identify the correct bufferizer based on the request
 *   type and invoke the buffering process.
 *
 * Dependencies:
 * - `@maps/keywordsMap.js`: Contains mappings for keywords like `mb.FUNCTION_PROPERTY` and
 *   data types such as `mb.NUMERIC_OUTPUT` and `mb.BOOLEAN_OUTPUT`.
 *
 * Usage:
 * The `ModbusPacketBufferizer` class is called to convert parsed request packets into buffers,
 * selecting the appropriate bufferizer based on request type. 
 *
 * Example:
 * ----------------
 * const buffer = ModbusPacketBufferizer.toBuffer(parsedPacket, request);
 *
 * Author: TEMPESTA, H. H.
 * Date: Oct 31st 2024
 */

require('module-alias/register');
const { mb } = require('@maps/keywordsMap.js');

class IORequestBufferizer {
    /**
     * Converts a parsed packet into a buffer with the specified size.
     * @param {Array} parsedPacket - The parsed packet array.
     * @param {number} bufferSize - The size of the buffer to create.
     * @returns {Buffer} - The buffer containing the packet data.
     */
    static toBuffer(parsedPacket, bufferSize) {
        const buffer = Buffer.alloc(bufferSize);
        buffer.writeUInt8(parsedPacket[0], 0);
        buffer.writeUInt8(parsedPacket[1], 1);
        buffer.writeUInt16BE(parsedPacket[2], 2);
        buffer.writeUInt16BE(parsedPacket[3], 4);
        return buffer;
    }
}

class ReadingRequestBufferizer extends IORequestBufferizer {
    /**
     * Buffers a parsed Modbus reading request.
     * @param {Array} parsedPacket - The parsed packet array.
     * @param {Object} request - The original request object.
     * @returns {Buffer} - The buffered request data.
     */
    static toBuffer(parsedPacket, request) {
        return super.toBuffer(parsedPacket, 6);
    }
}

class WritingRequestBufferizer extends IORequestBufferizer {
    /**
     * Buffers a parsed Modbus writing request, handling numeric or boolean data.
     * @param {Array} parsedPacket - The parsed packet array.
     * @param {Object} request - The original request object.
     * @returns {Buffer} - The buffered request data.
     */
    static toBuffer(parsedPacket, request) {
        const bufferSize = request[mb.DATATYPE_PROPERTY] === mb.NUMERIC_OUTPUT
            ? 7 + 2 * (parsedPacket.length - 4)
            : 7 + Math.ceil((parsedPacket.length - 4) / 8);
            
        const buffer = super.toBuffer(parsedPacket, bufferSize);
        buffer.writeUInt8(bufferSize - 7, 6);
        this.writeDataToBuffer(buffer, parsedPacket, request);
        
        return buffer;
    }

    /**
     * Writes data into the buffer for a Modbus writing request, supporting numeric and boolean data.
     * @param {Buffer} buffer - The buffer to write data into.
     * @param {Array} parsedPacket - The parsed packet array.
     * @param {Object} request - The original request object.
     */
    static writeDataToBuffer(buffer, parsedPacket, request) {
        if (request[mb.DATATYPE_PROPERTY] === mb.NUMERIC_OUTPUT) {
            parsedPacket.slice(4).forEach((data, i) => buffer.writeUInt16BE(data, 7 + 2 * i));
        } 
        else { // request[mb.DATATYPE_PROPERTY] === mb.BOOLEAN_OUTPUT
            let encodedByte = 0;
            let bytePosition = 7;

            parsedPacket.slice(4).forEach((data, i) => {
                if (data !== 0) { 
                    encodedByte |= (1 << (i % 8));
                }
                if (i % 8 === 7 || i === parsedPacket.length - 5) {
                    buffer.writeUInt8(encodedByte, bytePosition++);
                    encodedByte = 0;
                }
            });
        }
    }
}

class DiagnosisRequestBufferizer extends IORequestBufferizer {
    /**
     * Buffers a parsed Modbus diagnostic request.
     * @param {Array} parsedPacket - The parsed packet array.
     * @param {Object} request - The original request object.
     * @returns {Buffer} - The buffered request data.
     */
    static toBuffer(parsedPacket, request) {
        return super.toBuffer(parsedPacket, 6);
    }
}

class RawModbusRequestBufferizer {
    /**
     * Buffers a raw Modbus request without additional processing.
     * @param {Array} parsedPacket - The parsed packet array.
     * @param {Object} request - The original request object.
     * @returns {Buffer} - The buffered raw Modbus request.
     */
    static toBuffer(parsedPacket, request) {
        const buffer = Buffer.alloc(parsedPacket.length);
        parsedPacket.forEach((value, index) => { buffer.writeUInt8(value, index); });
        return buffer;
    }
}

class ModbusPacketBufferizer {
    
    /**
     * Selects the appropriate bufferizer class based on the request function property.
     * @param {Object} request - The original request object.
     * @returns {Class} - The appropriate bufferizer class.
     */
    static fetchBufferizer(request) {
        switch (request[mb.FUNCTION_PROPERTY]) {
            case mb.READ:
                return ReadingRequestBufferizer;
            case mb.WRITE:
                return WritingRequestBufferizer;
            case mb.DIAGNOSIS:
                return DiagnosisRequestBufferizer;
            case mb.MODBUS:
                return RawModbusRequestBufferizer;
        }
    }

    /**
     * Buffers the parsed packet using the appropriate bufferizer based on the request type.
     * @param {Array} parsedPacket - The parsed packet array.
     * @param {Object} request - The original request object.
     * @returns {Buffer} - The buffered request data.
     */
    static toBuffer(parsedPacket, request) {
        const bufferizer = this.fetchBufferizer(request);
        return bufferizer.toBuffer(parsedPacket, request);
    }
}

module.exports = ModbusPacketBufferizer;
