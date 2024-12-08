/**
 * keywordsMap.js
 * --------------
 * 
 * This module provides keyword mappings for Modbus requests in the MQTT-Modbus gateway system.
 * It processes keywords from the `modbusKeywords` JSON file and creates mappings for terse
 * and verbose formats, allowing retrieval of keys based on format type.
 *
 * Exports:
 * - `mb`: Object mapping keyword identifiers to their terse format.
 * - `getKey`: Function to retrieve a keyword in either terse or verbose format based on a value.
 * 
 * Dependencies:
 * - `@keywords/modbusKeywords.json`: JSON file containing Modbus keywords and their terse/verbose
 *   representations.
 *
 * Example:
 * ----------------
 * const { mb, getKey } = require('./keywordsMap');
 * const key = getKey(someValue, 'verbose');
 * 
 * Author: TEMPESTA, H. H.
 * Date: Oct 31st 2024
 */

require('module-alias/register');
const modbusKeywords = require('@keywords/modbusKeywords.json');

// Map keywords to their terse format representations
const mb = Object.entries(modbusKeywords).reduce((accumulator, entry) => {
    accumulator[entry[0]] = entry[1][0];
    return accumulator;
}, {});

/**
 * Retrieves the keyword in the specified format (terse or verbose).
 * 
 * @param {string} mbValue - The Modbus keyword value to map.
 * @param {string} format - The format type ('terse' or 'verbose').
 * @returns {string} - The keyword in the specified format.
 */
function getKey(mbValue, format) {
    const formatId = (format === 'terse') ? 0 : 1;
    return modbusKeywords[Object.keys(mb).find(key => mb[key] === mbValue)][formatId];
}

module.exports = { mb, getKey };
