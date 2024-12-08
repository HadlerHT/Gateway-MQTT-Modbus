/**
 * @file wifi_manager.h
 * @brief Wi-Fi management functions, including setup, connection, and event handling.
 *
 * This header provides functions to set up and manage a Wi-Fi connection in station mode,
 * including retry limits and connection status handling.
 *
 * External Dependencies:
 * - ESP-IDF Wi-Fi, event, and system libraries
 */

#pragma once

#include <stdint.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"
#include "esp_system.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "nvs_flash.h"
#include "lwip/err.h"
#include "lwip/sys.h"
#include "sdkconfig.h"

// Event bits for Wi-Fi status
#define WIFI_MAXIMUM_RETRY 5       ///< Maximum retry attempts for connection
#define WIFI_CONNECTED_BIT BIT0    ///< Wi-Fi connected status
#define WIFI_FAIL_BIT      BIT1    ///< Wi-Fi connection failure

// Wi-Fi configuration and event group handle
extern EventGroupHandle_t wifi_eventGroup;
extern wifi_config_t wifi_configure;

/**
 * @brief Initialize Wi-Fi and configure settings.
 */
void wifi_espSetup();

/**
 * @brief Initialize Wi-Fi in station mode.
 */
void wifi_initializeStation();

/**
 * @brief Handle Wi-Fi connection events.
 * @param arg Optional argument for the handler.
 * @param event_base Event base.
 * @param event_id Event identifier.
 * @param event_data Data associated with the event.
 */
void wifi_eventHandler(void* arg, esp_event_base_t event_base, int32_t event_id, void* event_data);

/**
 * @brief Disconnect from the Wi-Fi network.
 */
void wifi_disconnect();
