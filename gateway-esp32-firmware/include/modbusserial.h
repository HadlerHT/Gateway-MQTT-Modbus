/**
 * @file modbus.h
 * @brief Modbus communication interface functions for initializing, sending requests, and reading responses.
 *
 * This header defines the interface for Modbus communication over UART, including request handling,
 * response processing, and CRC evaluation.
 *
 * External Dependencies:
 * - <stdint.h>
 * - <stdio.h>
 * - <stdlib.h>
 * - <string.h>
 * - ESP-IDF driver libraries
 */

#pragma once

#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "driver/uart.h"
#include "uartmanager.h"

// Timeout duration for inter-symbol in milliseconds
extern uint16_t interSymbolTimeout_ms;

/**
 * @brief Initialize the Modbus communication interface.
 */
void modbus_initialize();

/**
 * @brief Send a Modbus request packet.
 * @param request Pointer to the request data.
 * @param length Length of the request packet.
 */
void modbus_sendRequestPacket(uint8_t* request, uint16_t length);

/**
 * @brief Read a Modbus response packet.
 * @param response Buffer to store the received data.
 * @param length Expected length of the response packet.
 * @param timeout_ms Timeout duration for receiving the response.
 * @return Number of bytes read.
 */
uint16_t modbus_readResponsePacket(uint8_t* response, uint16_t length, uint16_t timeout_ms);

/**
 * @brief Calculate inter-symbol timeout based on UART configuration.
 * @param uart_config UART configuration parameters.
 * @return Inter-symbol timeout in milliseconds.
 */
uint16_t modbus_calculateIntersymbolTimeout(const uart_config_t* uart_config);

/**
 * @brief Evaluate the CRC of a Modbus message.
 * @param data Pointer to data buffer.
 * @param length Length of the data.
 * @return Computed CRC value.
 */
uint16_t modbus_evaluateCRC(uint8_t* data, uint16_t length);

/**
 * @brief Extract the high byte of a 16-bit value.
 * @param value 16-bit input value.
 * @return High byte.
 */
uint8_t highByte(uint16_t value);

/**
 * @brief Extract the low byte of a 16-bit value.
 * @param value 16-bit input value.
 * @return Low byte.
 */
uint8_t lowByte(uint16_t value);
