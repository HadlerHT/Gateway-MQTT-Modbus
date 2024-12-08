# Define the sources for the main component
idf_component_register(SRCS "main.c"
                            "../src/modbusserial.c"
                            "../src/mqttclient.c"
                            "../src/uartmanager.c"
                            "../src/wifimanager.c"
                      INCLUDE_DIRS "." "../include")
