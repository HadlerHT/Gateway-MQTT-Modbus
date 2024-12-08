/**
 * MQTTBroker - Custom MQTT Broker for Modbus IoT Integration System
 * -------------------------------------------------------------------
 * 
 * This class operates as the primary communication layer for the MQTT-Modbus gateway, supporting
 * secure, authenticated, and authorized client access to Modbus devices through MQTT.
 *
 * Primary Roles in TCC Project:
 * - **Client and Device Authentication**: Validates clients and devices using MongoDB, enforcing
 *   secure, authenticated connections and managing sessions with timeout checks.
 * - **Topic-Based Authorization**: Manages client access to topics, ensuring only authorized
 *   clients can read or write to specified devices.
 * - **Session and Connection Management**: Tracks client activity, handling timeouts and clean
 *   disconnections, and provides error feedback when issues arise.
 *
 * Core Functionalities:
 * - **Authentication and Authorization**: Uses `DbAccess` to authenticate and authorize connections.
 * - **Session Timeout Management**: Logs out clients exceeding session timeout, ensuring only active
 *   clients are maintained.
 * - **Client Disconnection Management**: Handles client disconnects, including clean unsubscription
 *   and session data cleanup.
 * - **Graceful Shutdown**: Ensures no lingering sessions or unclosed connections upon broker shutdown.
 *
 * Key Dependencies:
 * - `aedes`: MQTT broker framework for handling MQTT protocol operations.
 * - `bcrypt`: Provides password hashing for secure client authentication.
 * - `@database/dataBaseAccess`: Manages MongoDB-based authentication for users and devices.
 *
 * Example Usage:
 * ----------------
 * const MQTTBroker = require('./path/to/MQTTBroker');
 * const broker = new MQTTBroker('mongodb://localhost:27017/mydb');
 * broker.start();
 *
 * Author: TEMPESTA, H. H.
 * Date: Oct 31st 2024
 */

require('module-alias/register');
const Aedes = require('aedes');
const net = require('net');
const DbAccess = require('@database/dataBaseAccess');

class MQTTBroker {

    /**
     * Initializes the MQTTBroker, setting up the Aedes broker instance, 
     * session management, and MongoDB-based authentication.
     * @param {string} dbUri - URI for connecting to the MongoDB database.
     * @param {number} [defaultPort=1883] - Port for the MQTT broker.
     * @param {number} [sessionTimeOut_min=5] - Session timeout in minutes.
     */
    constructor(dbUri, defaultPort = 1883, sessionTimeOut_min = 5) {
        this.aedes = Aedes();  // Create an instance of Aedes
        this.server = net.createServer(this.aedes.handle);
        this.port = defaultPort;

        this.dbAccess = new DbAccess(dbUri);

        // Bind authentication and authorization methods
        this.aedes.authenticate = this.authenticate.bind(this);
        this.aedes.authorizeSubscribe = this.authorizeSubscribe.bind(this);
        this.aedes.authorizePublish = this.authorizePublish.bind(this);

        // Listen for client disconnections
        this.aedes.on('unsubscribe', this.onUnsubscribe.bind(this));
        this.aedes.on('clientDisconnect', this.onClientDisconnect.bind(this));
        this.aedes.on('clientError', this.onClientError.bind(this));

        // Store sessions
        this.loggedInUsers = {};
        this.loggedInDevices = {};
        this.lastActivity = {};

        // Start periodic timeout check
        this.startTimeoutCheck(sessionTimeOut_min * 60000, 60000); // Refreshes every 60s
    }

    /**
     * Logs client errors to the console.
     * @param {Object} client - The client object where the error occurred.
     * @param {Error} err - The error encountered by the client.
     */
    onClientError(client, err) {
        console.log('\x1b[31m%s\x1b[0m', '[Client Error]', `${client.id} - ${err.message}`);
    }

    /**
     * Starts the MQTT broker, binding to the configured port, and sets up
     * graceful shutdown upon receiving termination signals.
     */
    start() {
        this.server.listen(this.port, '0.0.0.0', () => {  // Bind to IPv4
            console.log('\x1b[32m%s\x1b[0m', '[MQTT Broker]', `Running on port ${this.port}`);
        }).on('error', (err) => {
            console.log('\x1b[31m%s\x1b[0m', '[MQTT Broker]', err);
        });

        process.on('SIGINT', this.shutdown.bind(this));
        process.on('SIGTERM', this.shutdown.bind(this));
    }

    /**
     * Periodically checks session activity and logs out clients that have
     * exceeded the session timeout threshold.
     * @param {number} sessionTimeOut_ms - Session timeout in milliseconds.
     * @param {number} refreshPeriod_ms - Period in milliseconds between timeout checks.
     */
    startTimeoutCheck(sessionTimeOut_ms, refreshPeriod_ms) {
        setInterval(() => {
            const now = Date.now();

            const compoundLoggedList = { ...this.loggedInUsers, ...this.loggedInDevices }
            for (const clientId in compoundLoggedList) {
                const lastActive = this.lastActivity[clientId] || 0;
                if (now - lastActive > sessionTimeOut_ms) {
                    console.log('\x1b[33m%s\x1b[0m', '[Inactivity Time Out]', `${compoundLoggedList[clientId][0]}`);
                    this.logout(clientId);
                }
            }
        }, refreshPeriod_ms);
    }

    /**
     * Updates the last activity timestamp for a specified client.
     * @param {string} clientId - The ID of the client whose activity is being updated.
     */
    updateLastActivity(clientId) {
        this.lastActivity[clientId] = Date.now();
    }

    /**
     * Authenticates a client by validating credentials using the MongoDB database.
     * @param {Object} client - The client object attempting to authenticate.
     * @param {string} identifier - Username or device token.
     * @param {Buffer} password - The password for the client.
     * @param {Function} callback - Callback for authentication result.
     */
    async authenticate(client, identifier, password, callback) {

        console.log('\x1b[34m%s\x1b[0m', '[Authentication Attempt]', `${identifier}`);

        const [authenticator, loggedInList] = identifier.includes(".")
            ? [this.dbAccess.authenticateUser.bind(this.dbAccess), this.loggedInUsers]
            : [this.dbAccess.authenticateDevice.bind(this.dbAccess), this.loggedInDevices];

        let result;

        try {
            if (this.getIds(loggedInList).includes(identifier)) {
                throw new Error(`"${identifier}" already logged in`);
            }

            result = await authenticator(identifier, password.toString());
            if (!result.success) {
                throw new Error(result.message);
            }
        }
        catch (error) {
            console.error('\x1b[31m%s\x1b[0m', '[Authentication Failed]', `${error.message}`);
            callback(new Error(error.message), false);
            return;
        }

        console.log('\x1b[32m%s\x1b[0m', '[Authentication Successful]', `"${client.id}" as "${identifier}"`);
        loggedInList[client.id] = [result.identifier, result.devices];
        this.updateLastActivity(client.id);
        callback(null, true);
    }

    /**
     * Authorizes a client’s subscription to a specified topic.
     * @param {Object} client - The client requesting the subscription.
     * @param {Object} sub - The subscription object with topic information.
     * @param {Function} callback - Callback to allow or deny the subscription.
     */
    authorizeSubscribe(client, sub, callback) {
        const clientName = client._parser.settings.username
        console.log('\x1b[34m%s\x1b[0m', '[Subscription Attempt]', `${clientName} ---> ${sub.topic}`);

        try {
            let [identifier, device, operator] = sub.topic.split("/");

            if (['mbnet'].includes(operator)) {
                if (!this.getIds(this.loggedInDevices).includes(device)) {
                    throw new Error(`Unavailable Device: ${device}`)
                }
            }
            else if (["request", "response"].includes(operator)) {
                if (!this.getIds(this.loggedInUsers).includes(identifier)) {
                    throw new Error(`Unknown User: ${identifier}`);
                }
                else if (!this.getIds(this.loggedInDevices).includes(device)) {
                    throw new Error(`Unavailable Device: ${device}`)
                }
            }
            else {
                throw new Error(`Invalid Operator: ${operator}`);
            }
        }
        catch (err) {
            console.error('\x1b[31m%s\x1b[0m', '[Subscription Denied]', `${clientName} ---> ${sub.topic}. `, `${err.message}`);
            callback(new Error('Unauthorized'), null);
            return;
        }

        console.log('\x1b[32m%s\x1b[0m', `[Subscription Allowed]`, `${clientName} ---> ${sub.topic}`);
        this.updateLastActivity(client.id);
        callback(null, sub);
    }

    /**
     * Authorizes a client’s publication to a specified topic.
     * @param {Object} client - The client requesting the publication.
     * @param {Object} packet - The publication packet with topic and payload.
     * @param {Function} callback - Callback to allow or deny the publication.
     */
    authorizePublish(client, packet, callback) {
        const clientName = client._parser.settings.username;
        console.log('\x1b[36m%s\x1b[0m', '[Message Published]', `${clientName} ---> ${packet.topic}`);
        this.updateLastActivity(client.id);
        callback(null, packet);
    }

    /**
     * Registers a callback for incoming messages.
     * @param {Function} callback - Function to handle incoming messages.
     */
    onMessage(callback) {
        this.aedes.on('publish', async (packet, client) => {
            if (!(packet.topic && typeof packet.topic === 'string'))
                return;
            if (!client || !client.id)
                return;
            if (packet.hasOwnProperty('broker'))
                return;

            await callback(packet.topic, packet.payload.toString(), client.id);
        });
    }

    /**
     * Publishes a message to a specified topic.
     * @param {string} topic - The topic to publish to.
     * @param {Object|Buffer|string} __payload - The payload to be published.
     */
    publish(topic, __payload) {
        
        let payload;
        if (typeof __payload === 'object' && !Buffer.isBuffer(__payload)) {
            payload = JSON.stringify(__payload);
        } 
        else if (Buffer.isBuffer(__payload)) {
            payload = Buffer.concat([Buffer.from([0x00]), __payload]);
        }

        const packet = {
            'cmd': 'publish',
            'broker': 0,
            'qos': 2,
            'topic': topic,
            'payload': payload,
            'retain': false,
        };

        this.aedes.publish(packet, (err) => {
            if (err) {
                console.log('\x1b[31m%s\x1b[0m', '[Message Failed]', err.message);
            }
            else {
                console.log('\x1b[36m%s\x1b[0m', '[Message Published]', `broker ---> ${topic}`, payload);
            }
        });
    }

    /**
     * Logs out a client by removing subscriptions and disconnecting.
     * @param {string} clientId - The ID of the client to log out.
     */
    logout(clientId) {
        const client = this.aedes.clients[clientId];

        if (client) {
            Object.keys(client.subscriptions).forEach((topic) => {
                client.unsubscribe(topic, () => {});
            });
            client.close(() => {});
        }

        if (this.loggedInUsers[clientId]) {
            delete this.loggedInUsers[clientId];
        }
        if (this.loggedInDevices[clientId]) {
            delete this.loggedInDevices[clientId];
        }

        if (this.lastActivity[clientId]) {
            delete this.lastActivity[clientId];
        }
    }

    /**
     * Gracefully shuts down the MQTT broker.
     */
    shutdown() {
        this.server.close(() => {
            console.log('MQTT broker has been shut down');
            process.exit(0);
        });
    }

    /**
     * Logs unsubscription events to the console.
     * @param {string[]} topics - Topics from which the client unsubscribed.
     * @param {Object} client - The client object that unsubscribed.
     */
    onUnsubscribe(topics, client) {
        const clientName = client._parser.settings.username;
        topics.forEach((topic) => {
            console.log('\x1b[33m%s\x1b[0m', '[Unsubscription]', `${clientName} -X-> ${topic}`);
        });
    }

    /**
     * Handles client disconnections, logging them out if needed.
     * @param {Object} client - The client object that disconnected.
     */
    onClientDisconnect(client) {
        const clientId = client.id;
        const clientName = client._parser.settings.username;

        console.log('\x1b[33m%s\x1b[0m', '[Client Disconnected]', `${clientName}`);

        if (this.loggedInUsers[clientId]) {
            delete this.loggedInUsers[clientId];
        }
        if (this.loggedInDevices[clientId]) {
            delete this.loggedInDevices[clientId];
        }
    }

    /**
     * Retrieves a list of IDs from logged sessions for user or device authorization checks.
     * @param {Object} loggedObject - Object containing logged-in clients or devices.
     * @param {number} [id=0] - Index to access the desired client or device ID.
     * @returns {string[]} - List of client or device IDs.
     */
    getIds(loggedObject, id = 0) {
        const firstPositions = Object.keys(loggedObject).map(key => loggedObject[key][id]);
        return firstPositions;
    }
}

module.exports = MQTTBroker;
