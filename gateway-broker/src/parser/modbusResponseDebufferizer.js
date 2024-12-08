/**
 * ModbusResponseDebufferizer - Decodes Buffered Modbus Responses for MQTT Gateway
 * --------------------------------------------------------------------------------
 * 
 * This module defines classes that handle the decoding (debufferizing) of Modbus responses
 * received in buffered form, transforming them into arrays for easier handling and
 * interpretation in the MQTT-Modbus gateway. Each class supports a specific Modbus
 * function type, handling responses for writing, reading, diagnostic, and raw Modbus
 * commands.
 * 
 * Key Components:
 * - **WritingResponseDebufferizer**: Decodes buffered responses for Modbus writing requests.
 * - **ReadingResponseDebufferizer**: Decodes buffered responses for Modbus reading requests,
 *   supporting both numeric and boolean data types.
 * - **DiagnosisResponseDebufferizer**: Decodes diagnostic responses based on the Modbus
 *   subfunction.
 * - **RawModbusResponseDebufferizer**: Decodes raw Modbus responses without additional processing.
 * - **ModbusResponseDebufferizer**: Main class that determines the appropriate debufferizer
 *   based on the request and initiates the decoding process.
 *
 * Dependencies:
 * - `@maps/keywordsMap.js`: Provides constants like `mb.FUNCTION_PROPERTY` and data types.
 * - `@maps/diagnosisMap.js`: Contains mappings for diagnostic subfunctions.
 *
 * Usage:
 * Use `ModbusResponseDebufferizer.toArray(clientRequest)` to decode a buffered Modbus response
 * into a readable array format.
 *
 * Example:
 * ----------------
 * const decodedResponse = ModbusResponseDebufferizer.toArray(clientRequest);
 *
 * Author: TEMPESTA, H. H.
 * Date: Oct 31st 2024
 */

require('module-alias/register');
const { mb } = require('@maps/keywordsMap.js');
const { dataFetcherSubfunctionMap } = require('@maps/diagnosisMap.js');

class WritingResponseDebufferizer {
    /**
     * Decodes a Modbus writing response into an array format.
     * @param {Buffer} response - The buffered Modbus response.
     * @returns {Array} - Decoded response with ID, function, target offset, and target size.
     */
    static toArray(response) {
        return [
            response.readUInt8(0),      // ID
            response.readUInt8(1),      // FUNCTION
            response.readUInt16BE(2),   // TARGET OFFSET
            response.readUInt16BE(4),   // TARGET SIZE
        ];
    }
}

class ReadingResponseDebufferizer {
    /**
     * Decodes a Modbus reading response, handling numeric or boolean data types.
     * @param {Buffer} response - The buffered Modbus response.
     * @param {number} targetLength - Expected length of data in registers or bits.
     * @param {string} dataType - Data type of the response (numeric or boolean).
     * @returns {Array} - Decoded response with ID, function, and fetched data.
     */
    static toArray(response, targetLength, dataType) {
        let parsedResponse = [
            response.readUInt8(0),      // ID
            response.readUInt8(1),      // FUNCTION
        ];

        const fetchedDataParser = [mb.NUMERIC_INPUT, mb.NUMERIC_OUTPUT].includes(dataType)
            ? this.parseFetchedNumericData 
            : this.parseFetchedBooleanData;

        try {
            parsedResponse.push(...fetchedDataParser(response.slice(3), targetLength));
        }
        catch {
            parsedResponse.push(null);
        }

        return parsedResponse;
    }

    /**
     * Parses numeric data from the response.
     * @param {Buffer} response - Buffer containing the data.
     * @param {number} targetLength - Expected length of numeric data.
     * @returns {Array} - Array of parsed numeric data.
     */
    static parseFetchedNumericData(response, targetLength) {
        let fetchedData = [];
        for (let i = 0; i < targetLength * 2; i += 2) {
            fetchedData.push(response.readUInt16BE(i));
        }
        return fetchedData;
    }

    /**
     * Parses boolean data from the response, extracting individual bits.
     * @param {Buffer} response - Buffer containing the data.
     * @param {number} targetLength - Expected length of boolean data in bits.
     * @returns {Array} - Array of parsed boolean data.
     */
    static parseFetchedBooleanData(response, targetLength) {
        let fetchedData = [];
        for (let i = 0; i < response.length; i++) {
            const byte = response.readUInt8(i);
            for (let bit = 0; bit < 8; bit++) {
                fetchedData.push((byte >> bit) & 1);
                if (fetchedData.length === targetLength) break;
            }
        }
        return fetchedData;
    }
}

class DiagnosisResponseDebufferizer {
    /**
     * Decodes a Modbus diagnostic response, including fetched data when applicable.
     * @param {Buffer} response - The buffered Modbus response.
     * @param {Object} request - The original Modbus request object for reference.
     * @returns {Array} - Decoded response with ID, function, subfunction, and fetched data (optional).
     */
    static toArray(response, request) {
        const parsedResponse = [
            response.readUInt8(0),      // ID
            response.readUInt8(1),      // FUNCTION
            response.readUInt16BE(2),   // SUBFUNCTION
        ];

        if (dataFetcherSubfunctionMap[request[mb.SUBFUNCTION_PROPERTY]]) {
            parsedResponse.push(response.readUInt16BE(4)); // FETCHED DATA FOR DIAGNOSIS
        }

        return parsedResponse;
    }
}

class RawModbusResponseDebufferizer {
    /**
     * Decodes a raw Modbus response with minimal processing.
     * @param {Buffer} response - The buffered Modbus response.
     * @returns {Array} - Array of response bytes.
     */
    static toArray(response) {
        return response.map(byte => byte);
    }
}

class ModbusResponseDebufferizer {
    
    /**
     * Placeholder buffer representing a "null" response.
     */
    static nullBuffer = Buffer.from('4e756c6c', 'hex');

    /**
     * Selects the appropriate debufferizer based on the request type.
     * @param {Object} request - The original Modbus request object.
     * @returns {Class} - The corresponding debufferizer class for the request type.
     */
    static debufferizerFetcher(request) {
        switch(request[mb.FUNCTION_PROPERTY]) {
            case mb.WRITE:
                return WritingResponseDebufferizer;
            case mb.READ:
                return ReadingResponseDebufferizer; 
            case mb.DIAGNOSIS:
                return DiagnosisResponseDebufferizer;
            case mb.MODBUS:
                return RawModbusResponseDebufferizer;
        }
    }

    /**
     * Converts a client's buffered responses to an array format using the appropriate debufferizer.
     * @param {Object} clientRequest - Client request object containing response buffers.
     * @returns {Array} - Array of decoded responses.
     */
    static toArray(clientRequest) {
        const decoder = this.debufferizerFetcher(clientRequest.content);

        return clientRequest.bufferResponses.reduce((accumulator, response, index) => {
            const params = [response];   
            if (decoder === ReadingResponseDebufferizer) {
                params.push(clientRequest.parsedRequests[index][3], clientRequest.content[mb.DATATYPE_PROPERTY]);
            }
            else if (decoder === DiagnosisResponseDebufferizer) {
                params.push(clientRequest.content);
            }

            accumulator.push(decoder.toArray(...params));
            return accumulator;
        }, []);
    }
}

module.exports = ModbusResponseDebufferizer;
