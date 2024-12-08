/**
 * SchemaManager - Manages Schema Compilation for Modbus Requests in MQTT Gateway
 * --------------------------------------------------------------------------------
 * 
 * This module defines a `SchemaManager` class that dynamically compiles JSON schemas for
 * Modbus requests in both terse and verbose formats. Using placeholders in the schema
 * template, the `SchemaManager` replaces placeholders with actual keywords from the 
 * `modbusKeywords` and `modbusDiagnosis` maps based on the required format.
 *
 * Key Components:
 * - **Terse and Verbose Schema Compilation**: Dynamically generates JSON schemas by replacing
 *   placeholders in the schema template with appropriate terse or verbose keywords.
 * - **Subfunction Mapping**: Replaces a special `{SUBFUNCTIONS}` placeholder with an enumeration
 *   of allowed diagnostic subfunctions for the schema.
 *
 * Dependencies:
 * - `@keywords/modbusKeywords.json`: Provides placeholders and their terse/verbose replacements
 *   for Modbus request fields.
 * - `@keywords/diagnosisKeywords.json`: Provides placeholders and replacements for diagnostic
 *   subfunctions.
 *
 * Usage:
 * Use `compileSchema(template, format)` to generate a JSON schema from the template based on
 * the specified format ('terse' or 'verbose').
 *
 * Example:
 * ----------------
 * const schemaManager = new SchemaManager(schemaTemplate);
 * const terseSchema = schemaManager.terseSchema;
 *
 * Author: TEMPESTA, H. H.
 * Date: Oct 31st 2024
 */

require('module-alias/register');
const modbusKeywords = require('@keywords/modbusKeywords.json');
const modbusDiagnosis = require('@keywords/diagnosisKeywords.json');

class SchemaManager {

    /**
     * Constructor for SchemaManager.
     * Initializes schema placeholders and compiles terse and verbose schemas.
     * 
     * @param {Object} template - The base schema template with placeholders.
     */
    constructor(template) {
        this.schemaPlaceholders = modbusKeywords;
        this.subfunctionsPlaceholders = modbusDiagnosis;

        this.terseSchema = this.compileSchema(template, 'terse');
        this.verboseSchema = this.compileSchema(template, 'verbose');
    }

    /**
     * Compiles a schema by replacing placeholders with the appropriate terse or verbose terms.
     * 
     * @param {Object} template - The base schema template with placeholders.
     * @param {string} format - The format type ('terse' or 'verbose').
     * @returns {Object} - The compiled JSON schema.
     */
    compileSchema(template, format) {
        let schemaString = JSON.stringify(template);
        const replacementsIndex = format === 'terse' ? 0 : 1;

        for (const [placeholder, replacements] of Object.entries(this.schemaPlaceholders)) {
            const regex = new RegExp(`{${placeholder}}`, 'g');
            schemaString = schemaString.replace(regex, replacements[replacementsIndex]);
        }

        const subfunctionsEnum = Object.values(this.subfunctionsPlaceholders)
            .map(replacements => replacements[replacementsIndex])
            .join('","');
        const subfunctionsRegex = new RegExp(`\\{SUBFUNCTIONS\\}`, 'g');
        schemaString = schemaString.replace(subfunctionsRegex, subfunctionsEnum);

        return JSON.parse(schemaString);
    }
}

module.exports = SchemaManager;
