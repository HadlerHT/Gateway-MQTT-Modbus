/**
 * RequestQueue - A Queue System for Managing Modbus Requests in MQTT Gateway
 * ---------------------------------------------------------------------------
 * 
 * The `RequestQueue` class manages client requests in the MQTT to Modbus gateway system, ensuring
 * requests are processed sequentially and responses are properly relayed back to clients. It queues
 * incoming client requests, posts them to devices, and handles device responses, including timeout
 * and error management.
 *
 * Key Functionalities:
 * - **Queue Management**: Enqueues requests up to a defined maximum size (`maxSize`), processes them
 *   sequentially, and handles overflow by rejecting additional requests when full.
 * - **Device Communication**: Uses `postToDeviceCallback` to transmit buffered requests to the Modbus
 *   devices, waits for responses, and retries if responses are delayed.
 * - **Timeout Handling**: Implements response timeouts to manage delayed device responses, alerting
 *   the client if no response is received within the specified period.
 * - **Client Response Posting**: Transmits the final response back to the client via `postToClientCallback`,
 *   ensuring the client receives either the expected response or a timeout/error notification.
 *
 * Dependencies:
 * - `ClientRequest`: Instances of `ClientRequest` are enqueued, processed, and updated with device responses.
 * - `postToDeviceCallback` and `postToClientCallback`: Static callback functions must be assigned in the
 *   parent system to handle outgoing device messages and client responses.
 *
 * Usage in TCC System:
 * 1. Client requests are enqueued with `enqueue()`.
 * 2. `triggerQueue()` processes each request, sending packets to devices and awaiting responses.
 * 3. If a response times out, an error is logged and the client is notified via `postToClientCallback`.
 *
 * Example:
 * ----------------
 * const queue = new RequestQueue();
 * queue.enqueue(clientRequest);
 *
 * Author: TEMPESTA, H. H.
 * Date: Oct 31st 2024
 */

class RequestQueue {

    static postToClientCallback = null;
    static postToDeviceCallback = null;

    /**
     * Initializes the RequestQueue with an empty list of items and sets the processing state.
     * Limits the queue size to `maxSize`.
     */
    constructor() {
        this.items = [];
        this.processing = false;
        this.maxSize = 256;
    }

    /**
     * Adds a new request to the queue if the queue size limit has not been reached.
     * Starts processing the queue if it is not already being processed.
     * @param {ClientRequest} element - The client request to be added to the queue.
     */
    enqueue(element) {
        if (this.items.length >= this.maxSize) {
            return; // Queue is full; reject additional requests.
        }

        this.items.push(element);
        if (!this.processing) {
            this.triggerQueue();
        }
    }

    /**
     * Removes and returns the next item in the queue.
     * @returns {ClientRequest|null} - The dequeued request, or null if the queue is empty.
     */
    dequeue() {
        const item = this.items.shift();
        return item;
    }

    /**
     * Checks if the queue is empty.
     * @returns {boolean} - Returns true if the queue is empty; otherwise, false.
     */
    isEmpty() {
        const empty = this.items.length === 0;
        return empty;
    }

    /**
     * Returns the first item in the queue without removing it.
     * @returns {ClientRequest|null} - The first item in the queue, or null if the queue is empty.
     */
    peek() {
        return this.items[0];
    }

    /**
     * Waits for a response from the device, resolving if a response is received,
     * or rejecting if a timeout occurs.
     * @param {ClientRequest} item - The request item to await a response for.
     * @param {number} [timeout=15000] - The timeout period in milliseconds.
     * @returns {Promise<void>} - Resolves when a response is received; rejects on timeout.
     */
    async awaitForResponse(item, timeout = 15000) { // 5 seconds timeout by default
        const originalLength = item.bufferResponses.length;

        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            const checkLength = () => {
                if (item.bufferResponses.length > originalLength) {
                    resolve();
                } 
                else if (Date.now() - startTime >= timeout) {
                    reject(new Error(`[Request Timed Out] ${item.client}/${item.device}/mbnet`));
                } 
                else {
                    setTimeout(checkLength, 1); // Check every 1ms
                }
            };

            checkLength();
        });
    }

    /**
     * Processes each request in the queue, sending requests to the device and awaiting responses.
     * Posts responses to the client or logs timeout errors as needed.
     */
    async triggerQueue() {
        this.processing = true;

        while (!this.isEmpty()) {
            const item = this.peek();
            let hasTimedOut = false;

            for (const packet of item.bufferRequests) {
                this.postToDeviceCallback(item.client, item.device, packet);

                try {
                    await this.awaitForResponse(item, 3000);
                } 
                catch (error) {
                    console.error(error.message);
                    hasTimedOut = true;
                    break;
                }
            }    

            item.processClientResponse(hasTimedOut);
            this.postToClientCallback(item);
            this.dequeue();
        }
        
        this.processing = false;
    }
}

module.exports = RequestQueue;
