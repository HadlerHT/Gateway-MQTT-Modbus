/**
 * schemaTemplate - JSON Schema Template for Modbus Request Validation
 * ----------------------------------------------------------------------
 * 
 * This schema defines the structure and constraints for Modbus requests within the
 * MQTT-Modbus gateway, supporting four types of requests: Write, Read, Diagnosis, and
 * Modbus. Each type has specific property requirements and constraints enforced through
 * JSON schema rules and custom keywords.
 *
 * Schema Structure:
 * - **Root Object**: Must be of type 'object' with defined properties and no additional
 *   properties allowed.
 * - **Properties**:
 *   - `{ID_PROPERTY}`: Integer between 1 and 247, represents the unique Modbus ID.
 *   - `{FUNCTION_PROPERTY}`: Enum of Modbus functions `{WRITE}`, `{READ}`, `{DIAGNOSIS}`, and `{MODBUS}`.
 *   - `{DATATYPE_PROPERTY}`: Enum of data types including `{BOOLEAN_INPUT}`, `{BOOLEAN_OUTPUT}`, `{NUMERIC_INPUT}`, and `{NUMERIC_OUTPUT}`.
 *   - `{RANGE_PROPERTY}`: Optional array of exactly 2 integers, unique and sorted in ascending order.
 *   - `{LIST_PROPERTY}`: Optional array of unique integers with at least one item.
 *   - `{VALUES_PROPERTY}`: Optional array of integers with at least one item, representing data to write.
 *   - `{SUBFUNCTION_PROPERTY}`: Required for `DIAGNOSIS` function, validated against `{SUBFUNCTIONS}`.
 *   - `{PACKET_PROPERTY}`: Array of integers (0-255) for direct Modbus communication.
 *
 * Validation Rules:
 * 1. Required properties `{ID_PROPERTY}` and `{FUNCTION_PROPERTY}` must always be present.
 * 2. Based on `{FUNCTION_PROPERTY}`, additional constraints apply:
 *    - **Write Requests (`{WRITE}`)**:
 *      - `{VALUES_PROPERTY}` must be present, with a length matching `{RANGE_PROPERTY}` or `{LIST_PROPERTY}` size.
 *      - `{DATATYPE_PROPERTY}` must be `{BOOLEAN_OUTPUT}` or `{NUMERIC_OUTPUT}`.
 *      - Exactly one of `{RANGE_PROPERTY}` or `{LIST_PROPERTY}` must be present (XOR condition).
 *      - `{SUBFUNCTION_PROPERTY}` must not be present.
 *    - **Read Requests (`{READ}`)**:
 *      - `{VALUES_PROPERTY}` and `{SUBFUNCTION_PROPERTY}` must not be present.
 *      - Exactly one of `{RANGE_PROPERTY}` or `{LIST_PROPERTY}` must be present (XOR condition).
 *    - **Diagnosis Requests (`{DIAGNOSIS}`)**:
 *      - `{SUBFUNCTION_PROPERTY}` must be present and valid.
 *      - `{VALUES_PROPERTY}`, `{DATATYPE_PROPERTY}`, `{LIST_PROPERTY}`, and `{RANGE_PROPERTY}` must not be present.
 *    - **Modbus Requests (`{MODBUS}`)**:
 *      - `{PACKET_PROPERTY}` must be present.
 *      - No other properties (`{VALUES_PROPERTY}`, `{DATATYPE_PROPERTY}`, `{LIST_PROPERTY}`, `{RANGE_PROPERTY}`, `{SUBFUNCTION_PROPERTY}`) should be present.
 *
 * Custom Keywords:
 * - **validateReadRequest**: Ensures XOR condition on `{LIST_PROPERTY}` and `{RANGE_PROPERTY}`, disallows `{VALUES_PROPERTY}` and `{SUBFUNCTION_PROPERTY}` for Read requests.
 * - **validateWriteRequest**: Enforces presence of `{VALUES_PROPERTY}` and correct length, validates `{DATATYPE_PROPERTY}`, applies XOR condition on `{LIST_PROPERTY}` and `{RANGE_PROPERTY}`.
 * - **validateDiagnosisRequest**: Requires `{SUBFUNCTION_PROPERTY}`, disallows all other non-diagnostic parameters.
 * - **validateModbusRequest**: Requires `{PACKET_PROPERTY}`, disallows all other non-Modbus parameters.
 *
 * Usage:
 * This schema is used in conjunction with a validation system that dynamically replaces placeholders
 * like `{ID_PROPERTY}` with actual field names based on terse/verbose format requirements.
 *
 * Author: TEMPESTA, H. H.
 * Date: Oct 31st 2024
 */

const schemaTemplate = {
    type: 'object',
    properties: {
        '{ID_PROPERTY}': { type: 'integer', minimum: 1, maximum: 247 },
        '{FUNCTION_PROPERTY}': { type: 'string', enum: ['{WRITE}', '{READ}', '{DIAGNOSIS}', '{MODBUS}'] },
        '{DATATYPE_PROPERTY}': { type: 'string', enum: ['{BOOLEAN_INPUT}', '{BOOLEAN_OUTPUT}', '{NUMERIC_INPUT}', '{NUMERIC_OUTPUT}'] },
        '{RANGE_PROPERTY}': { type: 'array', items: { type: 'integer' }, minItems: 2, maxItems: 2, uniqueItems: true, ascendingItems: true },
        '{LIST_PROPERTY}': { type: 'array', items: { type: 'integer' }, minItems: 1, uniqueItems: true },
        '{VALUES_PROPERTY}': { type: 'array', items: { type: 'integer' }, minItems: 1 },
        '{SUBFUNCTION_PROPERTY}': { type: 'string', enum: ['{SUBFUNCTIONS}'] },
        '{PACKET_PROPERTY}': { type: 'array', items: { type: 'integer', minimum: 0, maximum: 255 } },
    },
    required: ['{ID_PROPERTY}', '{FUNCTION_PROPERTY}'],
    additionalProperties: false,
    validateReadRequest: {
        func:           '{FUNCTION_PROPERTY}',
        read:           '{READ}',
        values:         '{VALUES_PROPERTY}',
        list:           '{LIST_PROPERTY}',
        range:          '{RANGE_PROPERTY}',
        subfunctions:   '{SUBFUNCTION_PROPERTY}',
        packet:         '{PACKET_PROPERTY}',
    },
    validateWriteRequest: {
        func:           '{FUNCTION_PROPERTY}',
        write:          '{WRITE}',
        values:         '{VALUES_PROPERTY}',
        datatype:       '{DATATYPE_PROPERTY}',
        booleanOutput:  '{BOOLEAN_OUTPUT}',
        numericOutput:  '{NUMERIC_OUTPUT}',
        list:           '{LIST_PROPERTY}',
        range:          '{RANGE_PROPERTY}',
        subfunctions:   '{SUBFUNCTION_PROPERTY}',
        packet:         '{PACKET_PROPERTY}',
    },
    validateDiagnosisRequest: {
        func:           '{FUNCTION_PROPERTY}',
        diagnosis:      '{DIAGNOSIS}',
        subfunctions:   '{SUBFUNCTION_PROPERTY}',
        values:         '{VALUES_PROPERTY}',
        datatype:       '{DATATYPE_PROPERTY}',
        list:           '{LIST_PROPERTY}',
        range:          '{RANGE_PROPERTY}',
        packet:         '{PACKET_PROPERTY}',
    },
    validateModbusRequest: {
        func:           '{FUNCTION_PROPERTY}',
        modbus:         '{MODBUS}',
        subfunctions:   '{SUBFUNCTION_PROPERTY}',
        values:         '{VALUES_PROPERTY}',
        datatype:       '{DATATYPE_PROPERTY}',
        list:           '{LIST_PROPERTY}',
        range:          '{RANGE_PROPERTY}',
        packet:         '{PACKET_PROPERTY}',
    }
};

module.exports = schemaTemplate;
