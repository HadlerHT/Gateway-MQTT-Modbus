#include "wifimanager.h"

static const char* TAG = "Wifi Station";
EventGroupHandle_t wifi_eventGroup; // Handle for Wi-Fi event group

wifi_config_t wifi_configure = {
    .sta = {
        .ssid = CONFIG_WIFI_SSID,
        .password = CONFIG_WIFI_PASSWORD,
        .scan_method = WIFI_ALL_CHANNEL_SCAN,
        .sort_method = WIFI_CONNECT_AP_BY_SIGNAL,
        .threshold = {
            .rssi = -127, 
            .authmode = WIFI_AUTH_WPA2_PSK,
        },
    },
};

/**
 * @brief Handle Wi-Fi events to manage connection retries and IP configuration.
 * @param arg Optional arguments for the handler.
 * @param eventBase Event base (e.g., WIFI_EVENT or IP_EVENT).
 * @param eventID Event ID indicating the specific event.
 * @param eventData Event-specific data.
 */
void wifi_eventHandler(void* arg, esp_event_base_t eventBase, int32_t eventID, void* eventData) {
    static int retryNumber = 0;

    if (eventBase == WIFI_EVENT) {
        switch(eventID) {
            case WIFI_EVENT_STA_START:
                esp_wifi_connect();
                ESP_LOGI(TAG, "Connecting to Wi-Fi...");
                break;

            case WIFI_EVENT_STA_DISCONNECTED:
                if (retryNumber < WIFI_MAXIMUM_RETRY) {
                    esp_wifi_connect(); // Retry connection
                    retryNumber++;
                    ESP_LOGI(TAG, "Retrying connection to Wi-Fi. Attempt %d", retryNumber);
                } else {
                    xEventGroupSetBits(wifi_eventGroup, WIFI_FAIL_BIT);
                    ESP_LOGI(TAG, "Connection failed after max retries");
                }
                break;
            
            default:
                ESP_LOGI(TAG, "Unhandled Wi-Fi event ID: %d", (int)eventID);
                break;
        }
    } else if (eventBase == IP_EVENT && eventID == IP_EVENT_STA_GOT_IP) {
        retryNumber = 0; // Reset retry counter upon successful connection
        xEventGroupSetBits(wifi_eventGroup, WIFI_CONNECTED_BIT);
        ESP_LOGI(TAG, "Got IP address");
    }
}

/**
 * @brief Initialize non-volatile storage and log Wi-Fi setup start.
 */
void wifi_espSetup() {
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);
    ESP_LOGI(TAG, "Non-volatile storage initialized");
}

/**
 * @brief Initialize Wi-Fi in station mode, setting up event handlers and connecting.
 */
void wifi_initializeStation() {
    wifi_eventGroup = xEventGroupCreate();

    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));
    
    // Register Wi-Fi event handlers
    esp_event_handler_instance_t instanceAnyId;
    ESP_ERROR_CHECK(esp_event_handler_instance_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &wifi_eventHandler, NULL, &instanceAnyId));

    esp_event_handler_instance_t instanceGotIp;
    ESP_ERROR_CHECK(esp_event_handler_instance_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &wifi_eventHandler, NULL, &instanceGotIp));
    
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_configure));
    ESP_ERROR_CHECK(esp_wifi_start());

    ESP_LOGI(TAG, "Wi-Fi station initialized.");

    // Block until connection is established or maximum retries fail
    EventBits_t bits = xEventGroupWaitBits(wifi_eventGroup, WIFI_CONNECTED_BIT | WIFI_FAIL_BIT, pdFALSE, pdFALSE, portMAX_DELAY);

    if (bits & WIFI_CONNECTED_BIT) {
        ESP_LOGI(TAG, "Connected to AP %s", CONFIG_WIFI_SSID);
    } else if (bits & WIFI_FAIL_BIT) {
        ESP_LOGI(TAG, "Failed to connect to AP %s", CONFIG_WIFI_SSID);
    } else {
        ESP_LOGE(TAG, "Unexpected event occurred.");
    }

    ESP_ERROR_CHECK(esp_event_handler_instance_unregister(IP_EVENT, IP_EVENT_STA_GOT_IP, instanceGotIp));
    ESP_ERROR_CHECK(esp_event_handler_instance_unregister(WIFI_EVENT, ESP_EVENT_ANY_ID, instanceAnyId));
    vEventGroupDelete(wifi_eventGroup);
}

/**
 * @brief Disconnect from the Wi-Fi network.
 */
void wifi_disconnect() {
    ESP_ERROR_CHECK(esp_wifi_disconnect());
    ESP_LOGI(TAG, "Disconnected from Wi-Fi");
}
