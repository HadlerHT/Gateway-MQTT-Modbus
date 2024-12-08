#include "modbusserial.h"

/**
 * @brief Initialize Modbus communication by setting up UART.
 */
void modbus_initialize() {
    uart_initialize();
}

/**
 * @brief Send a Modbus request packet via UART.
 * @param data Pointer to the request data buffer.
 * @param length Length of the data buffer.
 */
void modbus_sendRequestPacket(uint8_t* data, uint16_t length) {
    uart_flush(UART_ID); // Clear UART buffer to prevent residual data interference
    uart_write_bytes(UART_ID, data, length); // Send Modbus packet over UART
    vTaskDelay(5); // Short delay to ensure packet transmission
    uart_flush_input(UART_ID); // Clear UART input buffer after sending packet
}

/**
 * @brief Read a Modbus response packet with inter-character timeout.
 * @param buffer Buffer to store the received data.
 * @param bufferSize Size of the buffer.
 * @param timeOut Timeout for the initial byte read in milliseconds.
 * @return Number of bytes read into the buffer.
 */
uint16_t modbus_readResponsePacket(uint8_t* buffer, uint16_t bufferSize, uint16_t timeOut) {
    // Read the first byte with the specified timeout
    uint8_t len = uart_read_bytes(UART_ID, &buffer[0], 1, timeOut / portTICK_PERIOD_MS);
    if (len == 0) 
        return 0; // If no data is read, return immediately

    uint16_t bytesRead = 1;
    while (bytesRead < bufferSize) {
        // Read subsequent bytes with inter-symbol timeout
        len = uart_read_bytes(UART_ID, &buffer[bytesRead], 1, interSymbolTimeout_ms / portTICK_PERIOD_MS);
        
        if (len > 0) 
            bytesRead++; // Increment byte count if data is received
        else
            break; // Exit loop if timeout occurs (end of frame)
    }

    return bytesRead; // Total bytes read
}

/**
 * @brief Evaluate CRC for Modbus packet data.
 * @param data Pointer to data buffer.
 * @param length Length of the data.
 * @return Calculated CRC value.
 */
uint16_t modbus_evaluateCRC(uint8_t* data, uint16_t length) {
    const uint16_t polynomial = 0xA001;
    uint16_t CRC = 0xFFFF; // Initialize with 0xFFFF for CRC calculations

    // Process each byte in the data buffer
    for (uint8_t byte = 0; byte < length; byte++) {
        CRC ^= data[byte];
        for (uint8_t i = 0; i < 8; i++) {
            // Shift and apply polynomial if the LSB is set
            if (CRC & 0x01)
                CRC = (CRC >> 1) ^ polynomial;
            else
                CRC >>= 1;
        }
    }

    return CRC; // Final calculated CRC value
}

/**
 * @brief Extract the low byte of a 16-bit word.
 * @param word 16-bit input word.
 * @return Low byte.
 */
uint8_t lowByte(uint16_t word) {
    return (uint8_t)(word & 0x00FF); // Mask to retrieve low byte
}

/**
 * @brief Extract the high byte of a 16-bit word.
 * @param word 16-bit input word.
 * @return High byte.
 */
uint8_t highByte(uint16_t word) {
    return (uint8_t)((word >> 8) & 0x00FF); // Shift and mask to retrieve high byte
}

/**
 * @brief Calculate inter-symbol timeout based on UART configuration.
 * @param config UART configuration struct.
 * @return Calculated timeout in milliseconds.
 */
uint16_t modbus_calculateIntersymbolTimeout(const uart_config_t* config) {
    uint8_t data_bits = 8, parity_bits = 0, stop_bits = 1;
    uint16_t timeout_ms;

    // Determine parity bits
    if (config->parity != UART_PARITY_DISABLE) parity_bits = 1;

    // Calculate timeout in milliseconds based on baud rate and symbol structure
    timeout_ms = (uint16_t)((double)1500.0 * (data_bits + parity_bits + stop_bits) / config->baud_rate);
    return (timeout_ms == 0) ? 1 : timeout_ms; // Ensure timeout is non-zero
}
