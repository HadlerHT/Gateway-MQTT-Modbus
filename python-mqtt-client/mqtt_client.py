import json
import paho.mqtt.client as mqtt
import logging
import time
from icecream import ic

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

class MQTTClient:
    def __init__(self, config):
        """
        Initialize the MQTT client with a configuration dictionary.
        The config dictionary should contain the following keys:
        - broker: The MQTT broker address
        - port: The MQTT broker port
        - username: The username for authentication
        - password: The password for authentication
        - request_topic: The topic to publish requests to
        - response_topic: The topic to subscribe for responses
        """
        self.broker = config.get('broker')
        self.port = config.get('port')
        self.username = config.get('username')
        self.password = config.get('password')
        self.device = config.get('device')
        self.request_topic = f'{self.username}/{self.device}/request'
        self.response_topic = f'{self.username}/{self.device}/response'
        self.is_connected = False  # Flag to check connection status

        # Initialize the MQTT client
        self.client = mqtt.Client()

        # Set the username and password for authentication
        self.client.username_pw_set(self.username, self.password)

        # Assign callback functions
        self.client.on_connect = self.on_connect
        self.client.on_publish = self.on_publish
        self.client.on_message = self.on_message
        self.client.on_subscribe = self.on_subscribe
        self.client.on_disconnect = self.on_disconnect

    # Connect callback function
    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logging.info("Connected to broker successfully")
            # Subscribe to both request and response topics with QoS 2 after successful connection
            self.subscribe(self.request_topic)
            self.subscribe(self.response_topic)
        else:
            logging.error(f"Connection failed with code {rc}: {mqtt.error_string(rc)}")

    # Disconnect callback function
    def on_disconnect(self, client, userdata, rc):
        if rc != 0:
            logging.error(f"Unexpected disconnection with reason code {rc}: {mqtt.error_string(rc)}")
        else:
            logging.info("Client disconnected successfully")

    # Subscribe callback function
    def on_subscribe(self, client, userdata, mid, granted_qos):
        logging.info(f"Subscribed to topic with QoS {granted_qos}")
        # Mark the client as connected after successful subscription
        self.is_connected = True

    # Publish callback function
    def on_publish(self, client, userdata, mid):
        logging.info("Message published")

    # Message received callback function
    def on_message(self, client, userdata, msg):
        try:
            # Parse the JSON message payload
            message = json.loads(msg.payload.decode())
            logging.info(f"Received message on {msg.topic}: {message}")
            if msg.topic == self.response_topic:
                logging.info(f"Response received: ")
                ic(message)
                
        except json.JSONDecodeError as e:
            logging.error(f"Failed to decode message: {e}")

    # Method to connect to the broker
    def connect(self):
        try:
            logging.info(f"Connecting to {self.broker}:{self.port} with keep-alive of 120 seconds")
            self.client.connect(self.broker, self.port, 120)  # Increase the keep-alive interval to 120 seconds
        except Exception as e:
            logging.error(f"Error during connection: {e}")

    # Method to publish a message
    def publish_message(self, message):
        try:
            if self.is_connected:  # Only publish if connected and subscribed
                message_json = json.dumps(message)
                result = self.client.publish(self.request_topic, message_json, qos=2)  # Ensure QoS 2
                result.wait_for_publish()  # Block until the message is published
                logging.debug(f"Message sent: {message_json} with QoS 2")
            else:
                logging.warning("Cannot publish message: not connected or subscribed yet.")
        except Exception as e:
            logging.error(f"Error while publishing message: {e}")

    # Method to subscribe to a topic
    def subscribe(self, topic):
        try:
            logging.info(f"Subscribing to topic: {topic} with QoS 2")
            self.client.subscribe(topic, qos=2)  # Ensure QoS 2 for subscription
        except Exception as e:
            logging.error(f"Error while subscribing to topic {topic}: {e}")

    # Start the MQTT loop
    def start_loop(self):
        try:
            logging.info("Starting MQTT loop")
            self.client.loop_start()
        except Exception as e:
            logging.error(f"Error starting MQTT loop: {e}")

        while not self.is_connected:
            logging.info("Waiting for connection and subscription...")
            time.sleep(1)

    # Stop the MQTT loop
    def stop_loop(self):
        try:
            logging.info("Stopping MQTT loop")
            self.client.loop_stop()
        except Exception as e:
            logging.error(f"Error stopping MQTT loop: {e}")

    # Disconnect from the broker
    def disconnect(self):
        try:
            logging.info("Disconnecting from broker")
            self.client.disconnect()
        except Exception as e:
            logging.error(f"Error during disconnection: {e}")
