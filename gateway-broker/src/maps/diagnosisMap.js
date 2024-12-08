/**
 * diagnosisMap.js
 * ----------------
 * 
 * This module processes diagnostic keywords for Modbus diagnosis requests, generating maps to 
 * translate diagnosis subfunction codes into meaningful responses and data-fetching instructions 
 * for the MQTT-Modbus gateway.
 *
 * Exports:
 * - `diagnosisMap`: Maps diagnosis subfunction codes to descriptive response messages.
 * - `dataFetcherSubfunctionMap`: Maps subfunction codes to data-fetching instructions for diagnostic requests.
 * 
 * Dependencies:
 * - `@keywords/diagnosisKeywords.json`: JSON file with Modbus diagnosis subfunctions, each entry
 *   containing a unique subfunction code, description, and associated data-fetching behavior.
 *
 * Example:
 * ----------------
 * const { diagnosisMap, dataFetcherSubfunctionMap } = require('./diagnosisMap');
 * const responseMessage = diagnosisMap[subfunctionCode];
 * const fetcher = dataFetcherSubfunctionMap[subfunctionCode];
 * 
 * Author: TEMPESTA, H. H.
 * Date: Oct 31st 2024
 */

require('module-alias/register');
const mbDiagnosis = require('@keywords/diagnosisKeywords.json');

// Map diagnosis subfunction codes to their descriptive responses
const diagnosisMap = Object.entries(mbDiagnosis).reduce((accumulator, entry) => {
    accumulator[entry[1][0]] = entry[1][2];
    return accumulator;
}, {});

// Map diagnosis subfunction codes to data-fetching instructions
const dataFetcherSubfunctionMap = Object.entries(mbDiagnosis).reduce((accumulator, entry) => {
    accumulator[entry[1][0]] = entry[1][3];
    return accumulator;
}, {});

module.exports = {
    diagnosisMap,
    dataFetcherSubfunctionMap
};
