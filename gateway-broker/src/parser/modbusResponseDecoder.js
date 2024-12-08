/**
 * ModbusResponseDecoder - Decodes Modbus Responses for MQTT-Modbus Gateway
 * -------------------------------------------------------------------------
 * 
 * This module contains classes to decode different types of Modbus responses, transforming them
 * into JSON-like structures for easier handling in the gateway system. Each class is specialized
 * for a specific Modbus function, such as reading, writing, diagnosis, or handling raw Modbus data.
 *
 * Key Components:
 * - **WritingResponseDecoder**: Decodes Modbus writing responses, validating basic response fields.
 * - **ReadingResponseDecoder**: Decodes Modbus reading responses, mapping data back to the requested
 *   addresses.
 * - **DiagnosisResponseDecoder**: Decodes diagnostic responses, extracting fetched data when present.
 * - **RawModbusResponseDecoder**: Decodes raw Modbus responses without additional interpretation.
 * - **ModbusResponseDecoder**: Main class that selects the appropriate decoder based on the Modbus
 *   function type and performs response validation.
 *
 * Dependencies:
 * - `@maps/keywordsMap.js`: Provides constants like `mb.FETCHED_DATA`, `mb.STATUS`, and function codes.
 *
 * Usage:
 * Use `ModbusResponseDecoder.createClientResponse(request, mbResponses)` to decode a Modbus
 * response based on the request type.
 *
 * Example:
 * ----------------
 * const decodedResponse = ModbusResponseDecoder.createClientResponse(request, mbResponses);
 *
 * Author: TEMPESTA, H. H.
 * Date: Oct 31st 2024
 */

require('module-alias/register');
const { mb } = require('@maps/keywordsMap.js');

class WritingResponseDecoder {
    
    static validatorTargetRange = [0, 1, 2, 3];

    /**
     * Decodes a Modbus writing response by verifying essential fields.
     * @param {Object} request - The original client request.
     * @param {Array} mbResponses - The Modbus responses to decode.
     * @returns {Object} - The decoded response with status and content.
     */
    static decode(request, mbResponses) {
        return JSON.parse(JSON.stringify(request.content));
    }
}

class ReadingResponseDecoder {

    static validatorTargetRange = [0, 1];

    /**
     * Decodes a Modbus reading response, associating fetched data with requested addresses.
     * @param {Object} request - The original client request.
     * @param {Array} mbResponses - The Modbus responses to decode.
     * @returns {Object} - The decoded response with fetched data.
     */
    static decode(request, mbResponses) {
        const response = JSON.parse(JSON.stringify(request.content));
        let fetchedData = [];

        request.parsedRequests.forEach((mbRequest, index) => {
            const targetOffset = mbRequest[2];
            const targetLength = mbRequest[3];

            for (let i = 0; i < targetLength; i++) {
                fetchedData.push([targetOffset + i, mbResponses[index][2 + i]]);
            }
        });

        response[mb.FETCHED_DATA] = request.content.hasOwnProperty(mb.RANGE_PROPERTY)
            ? fetchedData.sort((a, b) => a[0] - b[0]).map(self => self[1])
            : request.content[mb.LIST_PROPERTY].map(target => fetchedData[fetchedData.findIndex(subarray => subarray[0] === target)][1]);

        return response;
    }
}

class DiagnosisResponseDecoder {

    static validatorTargetRange = [0, 1, 2, 3];

    /**
     * Decodes a Modbus diagnostic response, extracting fetched data if present.
     * @param {Object} request - The original client request.
     * @param {Array} mbResponses - The Modbus responses to decode.
     * @returns {Object} - The decoded response with fetched diagnostic data.
     */
    static decode(request, mbResponses) {
        const response = JSON.parse(JSON.stringify(request.content));
        if (mbResponses[0].length === 4) {
            response[mb.FETCHED_DATA] = [mbResponses[0][3]];
        }
        return response;
    }
}

class RawModbusResponseDecoder {
    
    static validatorTargetRange = [0, 1];

    /**
     * Decodes a raw Modbus response with minimal interpretation.
     * @param {Object} request - The original client request.
     * @param {Array} mbResponses - The Modbus responses to decode.
     * @returns {Object} - The decoded response containing raw fetched data.
     */
    static decode(request, mbResponses) {
        const response = JSON.parse(JSON.stringify(request.content));
        response[mb.FETCHED_DATA] = mbResponses[0];
        return response;
    }
}

class ModbusResponseDecoder {

    /**
     * Selects the appropriate response decoder based on the request function type.
     * @param {Object} request - The client request with Modbus parameters.
     * @returns {Class} - The corresponding decoder class.
     */
    static decoderFetcher(request) {
        switch (request.content[mb.FUNCTION_PROPERTY]) {
            case mb.WRITE:
                return WritingResponseDecoder;
            case mb.READ:
                return ReadingResponseDecoder;
            case mb.DIAGNOSIS:
                return DiagnosisResponseDecoder;
            case mb.MODBUS:
                return RawModbusResponseDecoder;
        }
    }

    /**
     * Creates a decoded client response from the Modbus responses, validating the responses.
     * @param {Object} request - The client request with Modbus parameters.
     * @param {Array} mbResponses - Array of buffered Modbus responses.
     * @returns {Object} - The decoded response, with status set to true if valid.
     */
    static createClientResponse(request, mbResponses) {
        let response;

        if (this.validate(request, request.parsedRequests, mbResponses)) {
            const decoder = this.decoderFetcher(request);            
            response = decoder.decode(request, mbResponses);
            response[mb.STATUS] = true;
        } else {
            response = JSON.parse(JSON.stringify(request.content));
            response[mb.STATUS] = false;
        }
       
        return response;
    }

    /**
     * Validates Modbus responses by checking fields against expected values.
     * @param {Object} clientRequest - Client request containing Modbus parameters.
     * @param {Array} mbRequests - Array of parsed Modbus requests.
     * @param {Array} mbResponses - Array of Modbus responses.
     * @returns {boolean} - True if all responses match expected fields; otherwise, false.
     */
    static validate(clientRequest, mbRequests, mbResponses) {
        let decoder = this.decoderFetcher(clientRequest);
        return mbRequests.every((_, i) => {
            return decoder.validatorTargetRange.every((_, j) => {
                return mbRequests[i][j] === mbResponses[i][j];
            });
        });
    }
}

module.exports = ModbusResponseDecoder;
