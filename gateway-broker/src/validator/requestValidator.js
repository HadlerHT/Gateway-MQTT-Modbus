/**
 * Validator - Validates Modbus Requests for MQTT-Modbus Gateway
 * ----------------------------------------------------------------
 * 
 * This module defines a `Validator` class that uses the AJV (Another JSON Validator) library
 * to validate Modbus requests in both terse and verbose formats. It includes custom validation
 * keywords to enforce specific Modbus request requirements for write, read, diagnosis, and raw
 * Modbus requests.
 *
 * Key Components:
 * - **Schema Compilation**: Compiles AJV schemas using `SchemaManager` to create terse and verbose
 *   validation schemas.
 * - **Custom Keywords**: Defines custom validation rules for various Modbus request types, such as
 *   ensuring ascending order, enforcing required fields, and prohibiting disallowed fields.
 * - **Format Validation**: Detects whether an incoming request is terse or verbose based on unique
 *   identifiers and validates accordingly.
 *
 * Dependencies:
 * - `Ajv`: JSON schema validation library used for compiling and validating requests.
 * - `@schemas/requestSchema`: Template for the Modbus request schema.
 * - `@validator/schemaManager`: Manages schema creation for terse and verbose validation.
 *
 * Usage:
 * Use `validate(data)` to validate an incoming request based on its format.
 *
 * Example:
 * ----------------
 * const isValid = validator.validate(requestData);
 *
 * Author: TEMPESTA, H. H.
 * Date: Oct 31st 2024
 */

require('module-alias/register');
const Ajv               = require('ajv');
const schemaTemplate    = require('@schemas/requestSchema');
const SchemaManager     = require('@validator/schemaManager');

class Validator {

    /**
     * Constructor for Validator.
     * Initializes AJV with custom keywords and compiles schemas.
     * 
     * @param {Object} template - The schema template to use for validation.
     */
    constructor(template) {
        this.ajv = new Ajv({ allErrors: true });
        this.addCustomKeywords();
    
        const schemaManager = new SchemaManager(template);
        this.validateTerse = this.ajv.compile(schemaManager.terseSchema);
        this.validateVerbose = this.ajv.compile(schemaManager.verboseSchema);

        this.result = null;

    }

    /**
     * Validates the given data against the appropriate schema based on format.
     * 
     * @param {Object} data - The data to validate.
     * @returns {boolean} - True if valid, false otherwise.
     */
    validate(data) {
        const validateFormat = { 
            'id':         ['terse'  , this.validateTerse  ], 
            'identifier': ['verbose', this.validateVerbose] 
        };

        for (const key in validateFormat) {
            // Checks if incoming message is terse or verbose
            if (data.hasOwnProperty(key)) {
                // Store possible format
                let result = { format: validateFormat[key][0] };
                    
                // Try and validate request based on format
                result.isValid = validateFormat[key][1](data);
                
                // If packet could not be validated
                if (!result.isValid) {
                    // Generate error message
                    const error = validateFormat[key][1].errors[0];
                    result.msg = (error.instancePath.substring(1) + ' ' + error.message).trimStart();
                    if (error.keyword === 'enum') {
                        result.allowedValues = error.params.allowedValues;
                    }
                }
                this.result = result
                return result.isValid;
            }
        }

        this.result = { result: false, format: null, msg: "Unidentified format" };
        return false;
    }

    /**
     * Adds custom keywords to the AJV instance for specialized validation.
     */
    addCustomKeywords() {
        // Custom keyword to check ascending order in the range array
        this.ajv.addKeyword({
            keyword: 'ascendingItems',
            type: 'array',
            errors: true,
            validate: function validate(schema, data) {
                const valid = data.every((value, index, array) => index === 0 || array[index - 1] <= value);
                if (!valid) {
                    validate.errors = [{
                        instancePath: '',
                        schemaPath: '#/ascendingItems',
                        keyword: 'ascendingItems',
                        params: {},
                        message: 'Array items are not in ascending order'
                    }];
                    return false;
                }
                return true;
            }
        });
    
        // Custom keyword to enforce properties required for write requests
        this.ajv.addKeyword({
            keyword: 'validateWriteRequest',
            type: 'object',
            schemaType: 'object',
            validate: function validate(schema, data) {
                const { func, write, values, datatype, booleanOutput, numericOutput, list, range, subfunctions, packet } = schema;
                const errors = [];

                if (data[func] === write) {
                    if (data.hasOwnProperty(list) === data.hasOwnProperty(range)) {
                        errors.push({
                            keyword: 'validateWriteRequest',
                            message: `Either "${list}" or "${range}" must be present, but not both or neither`,
                            params: { keyword: 'validateWriteRequest' }
                        });
                    }
                    else if (!data.hasOwnProperty(values)) {
                        errors.push({
                            keyword: 'validateWriteRequest',
                            message: `"${values}" property must be present`,
                            params: { keyword: 'validateWriteRequest' }
                        });
                    }
                    else if (data[datatype] !== booleanOutput && data[datatype] !== numericOutput) {
                        errors.push({
                            keyword: 'validateWriteRequest',
                            message: `"${datatype}" must be either "${booleanOutput}" or "${numericOutput}"`,
                            params: { keyword: 'validateWriteRequest' }
                        });
                    }
                    else if (data[range] && (data[range][1] - data[range][0] + 1) !== data[values].length) {
                        errors.push({
                            keyword: 'validateWriteRequest',
                            message: `Size of "${values}" does not match "${range}"`,
                            params: { keyword: 'validateWriteRequest' }
                        });
                    }
                    else if (data[list] && data[list].length !== data[values].length) {
                        errors.push({
                            keyword: 'validateWriteRequest',
                            message: `Size of "${values}" does not match "${list}"`,
                            params: { keyword: 'validateWriteRequest' }
                        });
                    }
                    else if (data.hasOwnProperty(subfunctions) || data.hasOwnProperty(packet)) {
                        errors.push({
                            keyword: 'validateWriteRequest',
                            message: `"${subfunctions}" property should not be present`,
                            params: { keyword: 'validateWriteRequest' }
                        });
                    }
                }

                validate.errors = errors;
                return errors.length === 0;
            },
            errors: true
        });
    
        // Custom keyword to enforce properties required for read requests
        this.ajv.addKeyword({
            keyword: 'validateReadRequest',
            type: 'object',
            schemaType: 'object',
            validate: function validate(schema, data) {
                const { func, read, values, list, range, subfunctions, packet } = schema;
                const errors = [];

                if (data[func] === read) {
                    if (data.hasOwnProperty(list) === data.hasOwnProperty(range)) {
                        errors.push({
                            keyword: 'validateReadRequest',
                            message: `Either "${list}" or "${range}" must be present, but not both or neither`,
                            params: { keyword: 'validateReadRequest' }
                        });
                    }
                    if (data.hasOwnProperty(values) || data.hasOwnProperty(subfunctions) || data.hasOwnProperty(packet)) {
                        errors.push({
                            keyword: 'validateReadRequest',
                            message: `"${values}" property should not be present`,
                            params: { keyword: 'validateReadRequest' }
                        });
                    }
                }

                validate.errors = errors;
                return errors.length === 0;
            },
            errors: true
        });
    
        // Custom keyword to enforce properties required for diagnosis requests
        this.ajv.addKeyword({
            keyword: 'validateDiagnosisRequest',
            type: 'object',
            schemaType: 'object',
            validate: function validate(schema, data) {
                const { func, diagnosis, subfunctions, values, datatype, list, range, packet } = schema;
                const errors = [];

                if (data[func] === diagnosis) {
                    if (!data.hasOwnProperty(subfunctions)) {
                        errors.push({
                            keyword: 'validateDiagnosisRequest',
                            message: `"${subfunctions}" property must be present`,
                            params: { keyword: 'validateDiagnosisRequest' }
                        });
                    }
                    if (data.hasOwnProperty(values) || data.hasOwnProperty(datatype) || data.hasOwnProperty(list) || data.hasOwnProperty(range) || data.hasOwnProperty(packet)) {
                        errors.push({
                            keyword: 'validateDiagnosisRequest',
                            message: `No other parameters except "${subfunctions}" can be present`,
                            params: { keyword: 'validateDiagnosisRequest' }
                        });
                    }
                }

                validate.errors = errors;
                return errors.length === 0;
            },
            errors: true
        });

        // Custom keyword to enforce properties required for direct modbus requests
        this.ajv.addKeyword({
            keyword: 'validateModbusRequest',
            type: 'object',
            schemaType: 'object',
            validate: function validate(schema, data) {
                const { func, modbus, subfunctions, values, datatype, list, range, packet } = schema;
                const errors = [];

                if (data[func] === modbus) {
                    if (!data.hasOwnProperty(packet)) {
                        errors.push({
                            keyword: 'validateModbusRequest',
                            message: `"${packet}" property must be present`,
                            params: { keyword: 'validateModbusRequest' }
                        });
                    }
                    if (data.hasOwnProperty(values) || data.hasOwnProperty(datatype) || data.hasOwnProperty(list) || data.hasOwnProperty(range) || data.hasOwnProperty(subfunctions)) {
                        errors.push({
                            keyword: 'validateModbusRequest',
                            message: `No other parameters except "${packet}" can be present`,
                            params: { keyword: 'validateModbusRequest' }
                        });
                    }
                }

                validate.errors = errors;
                return errors.length === 0;
            },
            errors: true
        });
    }
}

const validator = new Validator(schemaTemplate);
module.exports = { Validator, validator };
