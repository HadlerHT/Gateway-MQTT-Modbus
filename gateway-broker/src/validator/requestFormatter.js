/**
 * RequestFormatter - Formats and Parses Modbus Requests for MQTT-Modbus Gateway
 * ------------------------------------------------------------------------------
 * 
 * This module provides a `RequestFormatter` class that formats and parses Modbus requests,
 * transforming them between verbose and terse formats as needed. It uses keyword mappings to
 * ensure consistency across different naming conventions in Modbus and diagnostic requests.
 *
 * Key Components:
 * - **Parsing**: Converts input data to a consistent format based on a specified 'verbose' or terse format.
 * - **Keyword Mapping**: Uses keyword mappings from JSON files to replace verbose keys with their terse
 *   equivalents and vice versa.
 * - **Format Correction**: Adjusts the request format to match the original input format, useful for
 *   responses and error handling.
 *
 * Dependencies:
 * - `@keywords/modbusKeywords.json`: Contains mappings for Modbus keywords.
 * - `@keywords/diagnosisKeywords.json`: Contains mappings for diagnosis keywords.
 * - `@maps/keywordsMap.js`: Provides utility functions like `getKey` for key translation.
 *
 * Usage:
 * Use `parse(data, format)` to parse incoming requests based on the specified format.
 * Use `correctFormat(newObject, oldObject, format)` to adjust the format to match an original request.
 *
 * Example:
 * ----------------
 * const formattedRequest = requestFormatter.parse(data, 'verbose');
 *
 * Author: TEMPESTA, H. H.
 * Date: Oct 31st 2024
 */

require('module-alias/register');
const modbusKeywords = require('@keywords/modbusKeywords.json');
const modbusDiagnosis = require('@keywords/diagnosisKeywords.json');
const { getKey } = require('@maps/keywordsMap.js');

class RequestFormatter {

    /**
     * Constructor for RequestFormatter.
     * Initializes the modbusKeywordsMap and modbusDiagnosisMap by calling the createUnifiedMap method.
     */
    constructor() {
        this.unifiedFormat = Object.entries(modbusKeywords).slice(0, 8).reduce((accumulator, entry) => {
            accumulator[entry[0]] = entry[1][0];
            return accumulator;
        }, {});
        
        this.modbusKeywordsMap = RequestFormatter.__createUnifiedMap(modbusKeywords);
        this.modbusDiagnosisMap = RequestFormatter.__createUnifiedMap(modbusDiagnosis);
    }

    /**
     * Parses the data according to the specified format (terse or verbose).
     * 
     * @param {Object} data - The data to parse.
     * @param {string} format - The format type ('verbose' or other).
     * @returns {Object} The parsed request.
     */
    parse(data, format) {
        let index = 0;
        if (format === 'verbose') {
            index = 1;
        }

        const parsedRequest = Object.keys(this.unifiedFormat).reduce((accumulator, key) => {
            const placeholder = modbusKeywords[key][index];
            const value = data[placeholder] || null;
        
            if (value !== null) {
                if (typeof value === 'string') {
                    accumulator[this.unifiedFormat[key]] = this.modbusKeywordsMap[value] || this.modbusDiagnosisMap[value] || value;
                } else {
                    accumulator[this.unifiedFormat[key]] = value;
                }
            }
            return accumulator;
        }, {});

        return parsedRequest;
    }

    /**
     * Creates a unified map from the target object.
     * 
     * @param {Object} targetObject - The object to create a map from.
     * @returns {Object} The unified map.
     */
    static __createUnifiedMap(targetObject) {
        return Object.keys(targetObject).reduce((accumulator, key) => {
            const [shortKey, longKey] = targetObject[key];
            accumulator[longKey] = shortKey; 
            return accumulator;
        }, {});
    }

    /**
     * Adjusts the format of a response or new object to match the format of an original request.
     * 
     * @param {Object} newObject - The object to adjust.
     * @param {Object} oldObject - The original object providing the reference format.
     * @param {string} format - The format type ('verbose' or terse).
     * @returns {Object} The adjusted object.
     */
    static correctFormat(newObject, oldObject, format) {
        const originalKeys = Object.keys(newObject);

        return originalKeys.reduce((accumulator, key) => {
            const originalKey = getKey(key, format);
            accumulator[originalKey] = oldObject[originalKey] || newObject[key];
            return accumulator;
        }, {});
    }
}

const requestFormatter = new RequestFormatter();
module.exports = { RequestFormatter, requestFormatter };
