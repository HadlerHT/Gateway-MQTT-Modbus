from mqtt_client import MQTTClient
import time
import logging


def main(client):

    msgs = []

    msgs.append({
        'id': 1, 
        'fn': 'r', 
        'dt': 'bi',
        'ls': [0, 1, 5, 7, 8, 9, 15]
    })

    msgs.append({
        'id': 7,
        'fn': 'r',
        'dt': 'ni',
        'rg': [16, 25]
    })

    msgs.append({
        'identifier': 2,
        'function': 'read',
        'datatype': 'boolean-output',
        'range': [1, 5]
    })

    msgs.append({
        'id': 1,
        'fn': 'r',
        'dt': 'no',
        'ls': [21, 8, 11, 10, 9, 1, 2, 4]
    })

    msgs.append({
        'id': 500,
        'fn': 'u',
        'dt': 'bo',
        'ls': [1, 2, 3, 4, 10, 11],
        'dv': [1, 0] * 3
    })

    msgs.append({
        'identifier': 5,
        'function': 'write',
        'datatype': 'numeric-output',
        'list':   [4, 2, 6, 3, 8, 9, 10, 22, 21, 23],
        'values': [2, 1, 0, 15, 33, 2, 102, 7, 11, 7]
    })

    msgs.append({
        'id': 22,
        'fn': 'd',
        'sf': 'rqdt',
    })

    for msg in msgs:
        client.publish_message(msg)


if __name__ == "__main__":

    config = {
        'broker': '0.0.0.0',
        'port': 1883,
        'username': 'hadler.usp',
        'password': 'password',
        'device': 'esp1@usp'
    }

    mqtt_client = MQTTClient(config)
    mqtt_client.connect()
    mqtt_client.start_loop()

    try:
        main(mqtt_client)

        while True:
            time.sleep(1)

    except Exception as e:
        logging.error(f"Exception in main loop: {e}")

    finally:
        mqtt_client.stop_loop()
        mqtt_client.disconnect()
