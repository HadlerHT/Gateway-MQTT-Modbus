/**
 * DBAccess - MongoDB Interface for User and Device Authentication in MQTT-Modbus Gateway
 * --------------------------------------------------------------------------------------
 * 
 * This class provides a MongoDB access layer for authenticating users and devices within an organization.
 * It supports credential verification, device token validation, and authorization management, facilitating
 * secure client-device interactions in the MQTT-Modbus gateway.
 * 
 * Key Functionalities:
 * - **Database Connection**: Establishes a connection to the MongoDB database using Mongoose.
 * - **Organization Management**: Fetches organization data, including users and devices, to manage
 *   permissions and identify allowed operations within an organization.
 * - **User Authentication**: Authenticates users by their organization-specific credentials, validating
 *   passwords and providing access to allowed devices.
 * - **Device Authentication**: Verifies device access based on token and password, ensuring each device
 *   has authorized entry.
 * - **Topic Permissions**: Retrieves and verifies permitted topics for each user, ensuring they access
 *   only allowed resources.
 * 
 * Dependencies:
 * - `mongoose`: Manages the MongoDB connection and schema-based document handling.
 * - `bcrypt`: Secures passwords by comparing hashed passwords for authentication.
 * - `@schemas/orgSchemas`: Defines organization schema structure, managing users and devices.
 *
 * Usage in TCC System:
 * 1. Instantiate `DBAccess` with a MongoDB URI to initialize the database connection.
 * 2. Use `authenticateUser()` and `authenticateDevice()` for secure login processes.
 * 3. Use `getPermittedTopics()` to retrieve and verify user access to specific devices.
 *
 * Example:
 * -----------
 * const dbAccess = new DBAccess('mongodb://localhost:27017/mydb');
 * const userAuth = await dbAccess.authenticateUser('username.orgName', 'password123');
 *
 * Author: TEMPESTA, H. H.
 * Date: Oct 31st 2024
 */

require('module-alias/register');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Organization = require('@schemas/orgSchemas');

class DBAccess {
    /**
     * Initializes the DBAccess class and establishes a MongoDB connection.
     * @param {string} dbUri - URI for connecting to MongoDB.
     */
    constructor(dbUri) {
        this.dbUri = dbUri;
        this.connectToDB();
    }

    /**
     * Connects to the MongoDB database using the URI provided in the constructor.
     * Logs success or failure in the console.
     */
    async connectToDB() {
        try {
            await mongoose.connect(this.dbUri, {});
            console.log('\x1b[32m%s\x1b[0m', '[Database]', 'Connected Successfully');
        } catch (err) {
            console.log('\x1b[31m%s\x1b[0m', '[Database]', err);
        }
    }

    /**
     * Fetches an organization by name from the database.
     * @param {string} organizationName - The name of the organization to retrieve.
     * @returns {Object|null} - The organization object if found; otherwise, null.
     */
    async getOrganization(organizationName) {
        try {
            const organization = await Organization.findOne({ organizationName }).lean();
            if (!organization) {
                console.log('\x1b[31m%s\x1b[0m', '[Database]', `${organizationName} not found`);
                return null;
            }
            return organization;
        } catch (error) {
            console.error('Error fetching organization:', error);
            return null;
        }
    }

    /**
     * Authenticates a user by their username and password within an organization.
     * @param {string} identifier - The identifier in the format 'username.organizationName'.
     * @param {string} password - The password for the user.
     * @returns {Object} - An object indicating success or failure with a message or user info.
     */
    async authenticateUser(identifier, password) {
        let username, organizationName;
        try { 
            [username, organizationName] = identifier.split('.');
        } catch { 
            return { success: false, message: 'Invalid user format' };
        }
        
        try {
            const organization = await this.getOrganization(organizationName);
            if (!organization) {
                return { success: false, message: 'Organization not found' };
            }

            const user = organization.users.find(user => user.username === username);
            if (!user) {
                return { success: false, message: 'User not found' };
            }

            const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
            return passwordMatch
                ? { success: true, identifier: identifier, devices: user.allowedDevices }
                : { success: false, message: 'Incorrect password' };
        } catch (error) {
            console.error('Error during user authentication:', error);
            return { success: false, message: 'Error during authentication' };
        }
    }

    /**
     * Authenticates a device by its token and password within an organization.
     * @param {string} identifier - The identifier in the format 'token@organizationName'.
     * @param {string} password - The password for the device.
     * @returns {Object} - An object indicating success or failure with a message or device info.
     */
    async authenticateDevice(identifier, password) {
        let token, organizationName;
        try { 
            [token, organizationName] = identifier.split('@');
        } catch { 
            return { success: false, message: 'Invalid user format' };
        }

        try {
            const organization = await this.getOrganization(organizationName);
            if (!organization) {
                return { success: false, message: 'Organization not found' };
            }

            const device = organization.devices.find(device => device.token === token);
            if (!device) {
                return { success: false, message: 'Device not found' };
            }

            const passwordMatch = await bcrypt.compare(password, device.hashedPassword);
            return passwordMatch
                ? { success: true, identifier: identifier }
                : { success: false, message: 'Incorrect device password' };
        } catch (error) {
            console.error('Error during device authentication:', error);
            return { success: false, message: 'Error during device authentication' };
        }
    }

    /**
     * Fetches permitted topics for a user within an organization.
     * @param {string} username - The username of the user.
     * @param {string} organizationName - The organization name where the user is registered.
     * @returns {Object} - An object with a list of topics or an error message if access fails.
     */
    async getPermittedTopics(username, organizationName) {
        try {
            const organization = await this.getOrganization(organizationName);
            if (!organization) {
                return { success: false, message: `Organization ${organizationName} not found` };
            }

            const user = organization.users.find(user => user.username === username);
            return user
                ? { success: true, topics: user.allowedDevices }
                : { success: false, message: `User ${username} not found in organization ${organizationName}` };
        } catch (error) {
            console.error('Error fetching permitted topics:', error);
            return { success: false, message: 'Error occurred while fetching topics' };
        }
    }

    /**
     * Checks if a user has access to a specific device/topic.
     * @param {string} identifier - The identifier in the format 'organizationName.username'.
     * @param {string} supposedTopic - The topic to validate.
     * @returns {boolean} - Returns true if access is allowed; otherwise, false.
     */
    authorizeDeviceAccess(identifier, supposedTopic) {
        const [org, username] = identifier.split('.');
        const topicPattern = /^mbnet\/[a-zA-Z0-9_-]+\/request$/;

        if (!topicPattern.test(supposedTopic)) {
            return false;
        }

        return userTopics.includes(deviceToken); // Placeholder; assumes `userTopics` and `deviceToken` are defined.
    }
}

module.exports = DBAccess;
