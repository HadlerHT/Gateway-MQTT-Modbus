#include "mqttclient.h"
#include "sdkconfig.h"

static const char *TAG = "MQTT";

// MQTT client handle and configuration
esp_mqtt_client_handle_t mqtt_client;
esp_mqtt_client_config_t mqtt_configure = {
    .broker.address.uri = CONFIG_MQTT_BROKER_URI,
    .broker.address.port = 1883,
    .credentials.username = CONFIG_MQTT_DEVICE_NAME,
    .credentials.authentication.password = CONFIG_MQTT_PASSWORD
};
char mqtt_topic[sizeof(CONFIG_MQTT_DEVICE_NAME) + 8];  // Holds the device topic for subscriptions

/**
 * @brief Event handler for MQTT events such as connection, disconnection, and message reception.
 * @param handlerArgs Arguments passed during event registration.
 * @param base Event base.
 * @param eventId ID of the event.
 * @param eventData Data associated with the event, esp_mqtt_event_handle_t.
 */
void mqtt_controlEventsHandler(void *handlerArgs, esp_event_base_t base, int32_t eventId, void *eventData) {
    ESP_LOGD(TAG, "Event dispatched from event loop base=%s, eventId=%" PRId32, base, eventId);
    esp_mqtt_event_handle_t event = eventData;

    switch ((esp_mqtt_event_id_t)eventId) {
        case MQTT_EVENT_CONNECTED:
            // Subscribe to the MQTT topic specific to the device
            snprintf(mqtt_topic, sizeof(mqtt_topic), "+/%s/mbnet", CONFIG_MQTT_DEVICE_NAME);
            ESP_LOGI(TAG, "Subscribing to topic: %s", mqtt_topic);
            esp_mqtt_client_subscribe(event->client, mqtt_topic, 2);  // QoS level 2
            break;

        case MQTT_EVENT_DISCONNECTED:
            ESP_LOGI(TAG, "MQTT_EVENT_DISCONNECTED");
            break;

        case MQTT_EVENT_SUBSCRIBED:
            ESP_LOGI(TAG, "MQTT_EVENT_SUBSCRIBED, msgId=%d", event->msg_id);
            break;

        case MQTT_EVENT_UNSUBSCRIBED:
            ESP_LOGI(TAG, "MQTT_EVENT_UNSUBSCRIBED, msgId=%d", event->msg_id);
            break;

        case MQTT_EVENT_PUBLISHED:
            ESP_LOGI(TAG, "MQTT_EVENT_PUBLISHED, msgId=%d", event->msg_id);
            break;

        case MQTT_EVENT_DATA:
            ESP_LOGI(TAG, "MQTT_EVENT_DATA received");
            // printf("TOPIC=%.*s\r\n", event->topic_len, event->topic);
            // printf("DATA=%.*s\r\n", event->data_len, event->data);
            break;

        case MQTT_EVENT_ERROR:
            ESP_LOGI(TAG, "MQTT_EVENT_ERROR");
            if (event->error_handle->error_type == MQTT_ERROR_TYPE_TCP_TRANSPORT) {
                log_error_if_nonzero("reported from esp-tls", event->error_handle->esp_tls_last_esp_err);
                log_error_if_nonzero("reported from tls stack", event->error_handle->esp_tls_stack_err);
                log_error_if_nonzero("captured as transport's socket errno", event->error_handle->esp_transport_sock_errno);
                ESP_LOGI(TAG, "Last errno string (%s)", strerror(event->error_handle->esp_transport_sock_errno));
            }
            break;

        default:
            ESP_LOGI(TAG, "Unhandled event id:%d", event->event_id);
            break;
    }
}

/**
 * @brief Start the MQTT client and initialize it with the configured broker settings.
 */
void mqtt_clientStart() {
    mqtt_client = esp_mqtt_client_init(&mqtt_configure);

    // Register handler for all required MQTT events
    esp_mqtt_client_register_event(mqtt_client, MQTT_EVENT_CONNECTED    , mqtt_controlEventsHandler, NULL);
    esp_mqtt_client_register_event(mqtt_client, MQTT_EVENT_DISCONNECTED , mqtt_controlEventsHandler, NULL);
    esp_mqtt_client_register_event(mqtt_client, MQTT_EVENT_SUBSCRIBED   , mqtt_controlEventsHandler, NULL);
    esp_mqtt_client_register_event(mqtt_client, MQTT_EVENT_UNSUBSCRIBED , mqtt_controlEventsHandler, NULL);
    esp_mqtt_client_register_event(mqtt_client, MQTT_EVENT_PUBLISHED    , mqtt_controlEventsHandler, NULL);
    esp_mqtt_client_register_event(mqtt_client, MQTT_EVENT_ERROR        , mqtt_controlEventsHandler, NULL);
    esp_mqtt_client_register_event(mqtt_client, MQTT_EVENT_DATA         , mqtt_controlEventsHandler, NULL);

    esp_mqtt_client_start(mqtt_client);  // Start the MQTT client
}

/**
 * @brief Publish a message to a specified MQTT topic.
 * @param topic Topic name.
 * @param topicLen Length of the topic string.
 * @param payload Message payload.
 * @param payloadLen Length of the payload.
 */
void mqtt_publishMessage(char* topic, uint16_t topicLen, char* payload, uint16_t payloadLen) {
    // Ensure the topic is properly null-terminated for safety
    char topicStr[topicLen + 1];
    memcpy(topicStr, topic, topicLen);
    topicStr[topicLen] = '\0';

    // Publish the payload to the specified topic with QoS level 2, non-retained
    esp_mqtt_client_publish(mqtt_client, topicStr, (const char*)payload, payloadLen, 2, false);
}

/**
 * @brief Set a custom handler for handling incoming MQTT data events.
 * @param handler Handler function pointer to manage data events.
 */
void mqtt_setDataEventHandler(esp_event_handler_t handler) {
    esp_mqtt_client_register_event(mqtt_client, MQTT_EVENT_DATA, handler, NULL);
}

/**
 * @brief Log errors if the provided error code is non-zero.
 * @param message Error message to log.
 * @param error_code Error code to evaluate.
 */
void log_error_if_nonzero(const char *message, int error_code) {
    if (error_code != 0) {
        ESP_LOGE(TAG, "Last error %s: 0x%x", message, error_code);
    }
}
