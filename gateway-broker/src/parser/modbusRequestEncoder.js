/**
 * ModbusPacketConstructor - Encodes Modbus Requests for MQTT-Modbus Gateway
 * ----------------------------------------------------------------------------
 * 
 * This module defines classes that encode various types of Modbus requests, including
 * reading, writing, diagnostic, and raw Modbus commands. Each class converts a high-level
 * request object into Modbus-compatible packet arrays.
 * 
 * Key Components:
 * - **IORequestEncoder**: Base encoder class that provides encoding logic for general
 *   input/output requests and handles range generation for Modbus commands.
 * - **ReadingRequestEncoder**: Encodes Modbus reading requests.
 * - **WritingRequestEncoder**: Encodes Modbus writing requests, supporting range and list
 *   configurations for data.
 * - **DiagnosisRequestEncoder**: Encodes diagnostic requests based on Modbus subfunctions.
 * - **RawModbusRequestEncoder**: Encodes raw Modbus requests without additional processing.
 * - **ModbusPacketConstructor**: Main class to determine the encoder type based on the request
 *   and initiate packet encoding.
 *
 * Dependencies:
 * - `@maps/keywordsMap.js`: Provides constants like `mb.FUNCTION_PROPERTY`, `mb.DATATYPE_PROPERTY`,
 *   and data types.
 * - `@maps/diagnosisMap.js`: Contains mappings for diagnostic subfunctions.
 *
 * Usage:
 * Use `ModbusPacketConstructor.parse(request)` to encode a Modbus request based on its function.
 *
 * Example:
 * ----------------
 * const encodedPackets = ModbusPacketConstructor.parse(request);
 *
 * Author: TEMPESTA, H. H.
 * Date: Oct 31st 2024
 */

require('module-alias/register');
const { mb } = require('@maps/keywordsMap.js');
const { diagnosisMap } = require('@maps/diagnosisMap.js');

class IORequestEncoder {
    
    

    /**
     * Encodes a general input/output request, converting it into Modbus packet format.
     * @param {Object} request - The request object with Modbus parameters.
     * @returns {Array} - An array containing packets and ranges.
     */
    static encodeIORequest(request) {
        let packets = [];
        const mbFunction = IORequestEncoder.determineModbusFunction(request);
        const ranges = IORequestEncoder.getRanges(request);
        packets.push(...ranges.map(range => [request[mb.ID_PROPERTY], mbFunction, range[0], range[1]]));
        return [packets, ranges];
    }

    /**
     * Determines the Modbus function code based on request properties.
     * @param {Object} request - The request object with Modbus parameters.
     * @returns {number} - The Modbus function code.
     */
    static determineModbusFunction(request) {
        const functionMap = {
            [`${mb.READ  + mb.BOOLEAN_OUTPUT}`]: 0x01,
            [`${mb.READ  + mb.BOOLEAN_INPUT}` ]: 0x02,
            [`${mb.READ  + mb.NUMERIC_OUTPUT}`]: 0x03,
            [`${mb.READ  + mb.NUMERIC_INPUT}` ]: 0x04,
            [`${mb.WRITE + mb.BOOLEAN_OUTPUT}`]: 0x0F,
            [`${mb.WRITE + mb.NUMERIC_OUTPUT}`]: 0x10,
        };
        return functionMap[request[mb.FUNCTION_PROPERTY] + request[mb.DATATYPE_PROPERTY]];
    }

    /**
     * Extracts the target address ranges from the request for encoding.
     * @param {Object} request - The request object with Modbus parameters.
     * @returns {Array} - Array of ranges with start address and count.
     */
    static getRanges(request) {
        if (request.hasOwnProperty(mb.RANGE_PROPERTY)) {
            const [start, end] = request[mb.RANGE_PROPERTY];
            return [[start, end - start + 1]];
        } 
        if (request.hasOwnProperty(mb.LIST_PROPERTY)) {
            return IORequestEncoder.getRangesFromList(request[mb.LIST_PROPERTY]);
        }
    }

    /**
     * Converts a list of addresses into contiguous ranges.
     * @param {Array} list - List of addresses.
     * @returns {Array} - Array of contiguous address ranges.
     */
    static getRangesFromList(list) {
        const target = [...list].sort((a, b) => a - b);
        const ranges = [];
        let rangeStart = target[0];

        for (let i = 0; i < target.length; i++) {
            if (target[i] !== target[i + 1] - 1) {
                ranges.push([rangeStart, target[i] - rangeStart + 1]);
                rangeStart = target[i + 1];
            }
        }
        return ranges;
    }
}

class ReadingRequestEncoder extends IORequestEncoder {
    /**
     * Encodes a Modbus reading request.
     * @param {Object} request - The request object with Modbus parameters.
     * @returns {Array} - An array of encoded Modbus packets.
     */
    static encode(request) {
        const [packets, _] = super.encodeIORequest(request);
        return packets;
    }
}

class WritingRequestEncoder extends IORequestEncoder {
    /**
     * Encodes a Modbus writing request, attaching data to the encoded packets.
     * @param {Object} request - The request object with Modbus parameters.
     * @returns {Array} - An array of encoded Modbus packets with data.
     */
    static encode(request) {
        let [packets, ranges] = super.encodeIORequest(request);
        const dataArrays = this.getData(request, ranges);
        for (let i = 0; i < packets.length; i++) {
            packets[i].push(...dataArrays[i]);
        }
        return packets;
    }
    
    /**
     * Retrieves data to be written, formatted to align with the Modbus ranges.
     * @param {Object} request - The request object with data values.
     * @param {Array} ranges - Array of address ranges for the request.
     * @returns {Array} - Data arrays corresponding to each Modbus range.
     */
    static getData(request, ranges) {
        if (request.hasOwnProperty(mb.RANGE_PROPERTY)) {
            return [request[mb.VALUES_PROPERTY]];
        }
        else {
            let dataArrays = [];
            for (const range of ranges) {
                let data = [];
                for (let i = 0; i < range[1]; i++) {
                    data.push(request[mb.VALUES_PROPERTY][request[mb.LIST_PROPERTY].indexOf(range[0] + i)]); 
                }
                dataArrays.push(data);
            }
            return dataArrays;
        } 
    }
}

class DiagnosisRequestEncoder {
    /**
     * Encodes a Modbus diagnostic request based on the specified subfunction.
     * @param {Object} request - The request object with diagnostic parameters.
     * @returns {Array} - An array containing the encoded diagnostic Modbus packet.
     */
    static encode(request) {
        return [[request[mb.ID_PROPERTY], 0x08, diagnosisMap[request[mb.SUBFUNCTION_PROPERTY]], 0x0000]];   
    }
}

class RawModbusRequestEncoder {
    /**
     * Encodes a raw Modbus request with minimal processing.
     * @param {Object} request - The request object containing raw Modbus data.
     * @returns {Array} - An array with the raw Modbus packet.
     */
    static encode(request) {
        return [[request[mb.ID_PROPERTY], ...request[mb.PACKET_PROPERTY]]];
    }
}

class ModbusPacketConstructor {
    
    /**
     * Selects the appropriate encoder class based on the request function type.
     * @param {Object} request - The request object with Modbus parameters.
     * @returns {Class} - The encoder class to handle the specific request.
     */
    static encoderFetcher(request) {
        switch (request[mb.FUNCTION_PROPERTY]) {
            case mb.READ:
                return ReadingRequestEncoder;
            case mb.WRITE:
                return WritingRequestEncoder;
            case mb.DIAGNOSIS:
                return DiagnosisRequestEncoder;
            case mb.MODBUS:
                return RawModbusRequestEncoder;
        }
    }

    /**
     * Parses the request object into an encoded Modbus packet array.
     * @param {Object} request - The request object with Modbus parameters.
     * @returns {Array} - Encoded Modbus packet array.
     */
    static parse(request) {
        const encoder = ModbusPacketConstructor.encoderFetcher(request);
        return encoder.encode(request);
    }
}

module.exports = ModbusPacketConstructor;
