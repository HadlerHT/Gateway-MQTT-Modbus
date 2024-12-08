#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include "wifimanager.h"
#include "mqttclient.h"
#include "uartmanager.h"
#include "modbusserial.h"

#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <freertos/semphr.h>

// Forward declarations for event handling functions
void mqtt_dataEventHandler(void*, esp_event_base_t, int32_t, void*);
void gatewayHandler(esp_mqtt_event_handle_t event);

// Global variable to hold the MQTT event data
esp_mqtt_event_handle_t mqttEventData;

/**
 * @brief Main application entry point. Initializes Wi-Fi, MQTT, and Modbus components.
 */
void app_main(void) {
    esp_log_level_set("*", ESP_LOG_INFO);

    wifi_espSetup();
    wifi_initializeStation();

    mqtt_clientStart();
    mqtt_setDataEventHandler(mqtt_dataEventHandler);

    modbus_initialize();
}

/**
 * @brief Event handler for incoming MQTT messages. Processes the message, interacts with Modbus,
 *        and publishes the Modbus response back to MQTT.
 * @param handlerArgs User data provided during registration.
 * @param base Event base for the handler (e.g., MQTT event base).
 * @param eventId Specific event ID.
 * @param eventData Data associated with the event, esp_mqtt_event_handle_t.
 */
void mqtt_dataEventHandler(void *handlerArgs, esp_event_base_t base, int32_t eventId, void *eventData) {   
    mqttEventData = eventData;

    // Ignore messages originating from this device
    if (mqttEventData->data[0] == 0xFF)
        return;

    // Process the incoming message
    gatewayHandler(eventData);
}

/**
 * @brief Handles the Modbus communication logic by parsing the MQTT payload, sending a request to Modbus,
 *        and publishing the response back to MQTT.
 * @param event MQTT event data handle containing the message and topic information.
 */
void gatewayHandler(esp_mqtt_event_handle_t event) {
    ESP_LOGI("MQTTHANDLER", "Handling incoming MQTT message");

    // Ignore messages with a specific starting byte (e.g., 0x01)
    if (event->data[0] == 0x01)
        return;

    // Parse the payload and prepare for Modbus
    ESP_LOGI("MQTTHANDLER", "Parsing payload");
    uint8_t payload[event->data_len + 1]; // Additional byte for CRC
    uint16_t payloadLen = event->data_len + 1;
    memcpy(payload, (uint8_t*)(event->data + 1), event->data_len);

    // Calculate CRC for payload and append it
    ESP_LOGI("MQTTHANDLER", "Encoding CRC");
    uint16_t crc = modbus_evaluateCRC(payload, payloadLen - 2);
    payload[payloadLen - 2] = lowByte(crc);
    payload[payloadLen - 1] = highByte(crc);

    // Display the parsed payload for debugging
    ESP_LOGI("MQTTHANDLER", "Payload:");
    for (unsigned char k = 0; k < payloadLen; k++) {
        printf("%02x ", payload[k]);
    }
    printf("\n");

    // Send the prepared payload over UART and await a Modbus response
    ESP_LOGI("MQTTHANDLER", "Sending to Modbus slave");
    uint8_t response[265];
    uint16_t responseLen = 0;

    // Attempt to send the payload and read a response
    for (uint8_t attempts = 0; attempts < 1; attempts++) {
        ESP_LOGI("MQTTHANDLER", "Attempting to send");

        modbus_sendRequestPacket(payload, payloadLen);
        responseLen = modbus_readResponsePacket(response, 265, 500); // 500ms timeout

        // Check for valid response and CRC verification
        if (responseLen > 0 && !modbus_evaluateCRC(response, responseLen)) {
            ESP_LOGI("MQTTHANDLER", "Received valid response");
            break;
        }
    }

    // Handle cases where no response is received from Modbus
    if (responseLen < 1) {
        ESP_LOGI("MQTTHANDLER", "No response received, handling error");
        memcpy(response, "Null", 4); // Send "Null" as error response
        responseLen = 6;
        printf("Error\n");
    }

    // Prepare and publish the Modbus response back to MQTT
    ESP_LOGI("MQTTHANDLER", "Publishing response to MQTT broker");

    uint8_t taggedResponse[266];
    taggedResponse[0] = 0x01; // Adds a tag saying the data comes from the esp32
    memcpy((char*)(taggedResponse + 1), response, responseLen - 2);

    // Publish the message to the original MQTT topic
    mqtt_publishMessage((char*)(event->topic), event->topic_len, (char*)taggedResponse, responseLen - 1);

    // Display the response payload for debugging
    ESP_LOGI("MQTTHANDLER", "Response Payload:");
    for (uint8_t k = 0; k < responseLen; k++) {
        printf("%02x ", response[k]);
    }
    printf("\n");
}
