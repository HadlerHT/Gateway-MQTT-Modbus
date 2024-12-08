/**
 * @file uart_manager.h
 * @brief UART initialization and configuration for communication with connected devices.
 *
 * This header defines UART configurations and pins for UART communication, including
 * initialization and hardware pin assignments.
 *
 * External Dependencies:
 * - ESP-IDF UART and GPIO driver libraries
 */

#pragma once

#include <stdint.h>
#include "freertos/FreeRTOS.h"
#include "driver/uart.h"
#include "driver/gpio.h"
#include "sdkconfig.h"
#include "esp_log.h"

// UART hardware and pin configurations
#define UART_ID 1         ///< UART ID to be used
#define RX_PIN 8          ///< RX pin number
#define TX_PIN 3          ///< TX pin number
#define RTS_PIN 4         ///< Request to Send pin (Driver Enable for RS485)
#define CTS_PIN UART_PIN_NO_CHANGE ///< Clear to Send pin (unused)

// UART configuration structure
extern uart_config_t uart_configure;

/**
 * @brief Initialize UART with predefined configurations.
 */
void uart_initialize();
