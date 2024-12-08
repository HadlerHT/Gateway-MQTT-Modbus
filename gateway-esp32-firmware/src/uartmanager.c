#include "uartmanager.h"
#include "modbusserial.h"

#define BAUDRATE 115200 // Define UART baud rate
uint16_t interSymbolTimeout_ms = 1; // Initialize inter-symbol timeout variable

/**
 * @brief Initialize UART for communication with specified configurations.
 */
void uart_initialize() {
    // UART configuration parameters
    uart_config_t uart_configure = {
        .baud_rate = BAUDRATE,
        .data_bits = UART_DATA_8_BITS,
        .parity    = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
        .source_clk = UART_SCLK_DEFAULT,
    };

    interSymbolTimeout_ms = modbus_calculateIntersymbolTimeout(&uart_configure); // Calculate timeout
    uart_driver_install(UART_ID, 264, 0, 0, NULL, 0); // Install UART driver
    uart_param_config(UART_ID, &uart_configure); // Configure UART parameters
    uart_set_pin(UART_ID, TX_PIN, RX_PIN, RTS_PIN, CTS_PIN); // Assign pins
    uart_set_mode(UART_ID, UART_MODE_RS485_HALF_DUPLEX); // Set RS485 half-duplex mode
}
