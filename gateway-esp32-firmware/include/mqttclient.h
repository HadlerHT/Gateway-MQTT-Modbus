/**
 * @file mqtt_client.h
 * @brief MQTT client interface for ESP32-based applications, including client configuration, publishing, and event handling.
 *
 * This header provides an interface for MQTT client operations, including connecting, message publishing,
 * and setting up event handlers.
 *
 * External Dependencies:
 * - ESP-IDF Wi-Fi, System, MQTT libraries
 */

#pragma once

#include <stdio.h>
#include <stdint.h>
#include <stddef.h>
#include <string.h>
#include "esp_wifi.h"
#include "esp_system.h"
#include "nvs_flash.h"
#include "esp_event.h"
#include "esp_netif.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/semphr.h"
#include "freertos/queue.h"
#include "lwip/sockets.h"
#include "lwip/dns.h"
#include "lwip/netdb.h"
#include "esp_log.h"
#include "mqtt_client.h"

// Device ID and topic for MQTT communications
extern const char mqtt_deviceID[];
extern char mqtt_topic[];

// MQTT client configuration and instance handle
extern esp_mqtt_client_handle_t mqtt_client;
extern esp_mqtt_client_config_t mqtt_configure;

/**
 * @brief Start the MQTT client and establish a connection with the broker.
 */
void mqtt_clientStart();

/**
 * @brief Publish a message to an MQTT topic.
 * @param topic MQTT topic to publish the message.
 * @param topic_len Length of the topic string.
 * @param payload Message payload to publish.
 * @param payload_len Length of the payload.
 */
void mqtt_publishMessage(char* topic, uint16_t topic_len, char* payload, uint16_t payload_len);

/**
 * @brief Set a data event handler for MQTT messages.
 * @param handler Event handler function pointer.
 */
void mqtt_setDataEventHandler(esp_event_handler_t handler);

/**
 * @brief Control the MQTT events, handling connection and message events.
 * @param arg Optional argument for the handler.
 * @param event_base Event base.
 * @param event_id Event identifier.
 * @param event_data Data associated with the event.
 */
void mqtt_controlEventsHandler(void* arg, esp_event_base_t event_base, int32_t event_id, void* event_data);

/**
 * @brief Log errors if the provided value is non-zero.
 * @param message Error message to log.
 * @param error_code Error code to evaluate.
 */
void log_error_if_nonzero(const char* message, int error_code);
