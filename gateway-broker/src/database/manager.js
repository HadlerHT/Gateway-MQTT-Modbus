/**
 * @file manager.js
 * @description This script connects to a MongoDB database to manage organizations, users,
 *              and devices for the Modbus-MQTT gateway system. It allows for displaying,
 *              adding, and authenticating organizations, and for assigning users and devices
 *              within specific organizations.
 * 
 * Usage:
 * - Run the script with `node manager.js show` to view the database contents.
 * - Run the script with `node manager.js` to execute the main process for adding and updating
 *   organizations, users, and devices.
 * 
 * Commands:
 * - `show`: Display the entire database contents.
 * - `addOrganization`: Adds a new organization with hashed password storage.
 * - `addUserToOrganization`: Adds a user with a hashed password to an organization.
 * - `addDeviceToOrganization`: Registers a new device within an organization.
 * - `addDeviceToUser`: Assigns a registered device to a user in an organization.
 * 
 * Dependencies:
 * - `mongoose`: MongoDB ORM for Node.js.
 * - `bcrypt`: Password hashing library for secure storage and comparison.
 * 
 * @requires mongoose
 * @requires bcrypt
 * @requires @schemas/orgSchemas - MongoDB schema for managing organizations, users, and devices.
 */

require('module-alias/register');
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Organization = require('@schemas/orgSchemas');

// MongoDB connection URI
const uri = "mongodb://localhost:27017/broker";

// Connect to MongoDB
mongoose
    .connect(uri)
    .then(() => {
        console.log("Connected to MongoDB");

        const action = process.argv[2]; // Read the action from the command-line arguments

        if (action === 'show') {
            showDatabaseContents(); // Show the DB contents
        } else {
            run(); // Run the full process
        }
    })
    .catch((error) => {
        console.error("Error connecting to MongoDB:", error);
    });

/**
 * Finds and displays all organizations in the database.
 */
async function findOrganizations() {
    try {
        console.log("Finding all organizations...");
        const organizations = await Organization.find({}).lean();
        organizations.forEach((organization) => {
            console.log(`
            Organization: ${organization.organizationName}
            Users: ${organization.users.length}
            Devices: ${organization.devices.length}`);
        });
    } catch (error) {
        console.error("Error finding organizations:", error);
    }
}

/**
 * Adds a new organization to the database with a hashed password.
 * 
 * @param {string} organizationName - Name of the organization.
 * @param {string} rawPassword - Plain-text password to be hashed.
 */
async function addOrganization(organizationName, rawPassword) {
    try {
        const existingOrganization = await Organization.findOne({ organizationName });
        if (existingOrganization) {
            console.log(`Organization with name ${organizationName} already exists.`);
            return;
        }

        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        const newOrganization = new Organization({
            organizationName: organizationName,
            hashedPassword: hashedPassword,
            users: [],
            devices: []
        });

        await newOrganization.save();
        console.log(`New organization ${organizationName} added successfully.`);
    } catch (error) {
        console.error("Error adding new organization:", error);
    }
}

/**
 * Verifies access to an organization by comparing a provided password.
 * 
 * @param {string} organizationName - Name of the organization.
 * @param {string} rawPassword - Password to compare.
 * @returns {Object|null} - The organization document if access is granted, null otherwise.
 */
async function accessOrganization(organizationName, rawPassword) {
    try {
        const organization = await Organization.findOne({ organizationName });
        if (!organization) {
            console.log(`No organization found with the name: ${organizationName}`);
            return null;
        }

        const isPasswordCorrect = await bcrypt.compare(rawPassword, organization.hashedPassword);
        if (!isPasswordCorrect) {
            console.log("Incorrect organization password.");
            return null;
        }

        console.log(`Access granted to organization: ${organizationName}`);
        return organization;
    } catch (error) {
        console.error("Error accessing organization:", error);
    }
}

/**
 * Main sequence of operations including adding users and devices to organizations.
 */
async function run() {
    try {
        await addUserToOrganization('usp', 'org-password', 'user1', 'password');
        await addUserToOrganization('usp', 'org-password', 'user2', 'password');

        await addDeviceToUser('usp', 'org-password', 'user1', 'password', 'esp1', 'esp-password');
        await addDeviceToUser('usp', 'org-password', 'user2', 'password', 'esp1', 'esp-password');

        await findOrganizations();
        mongoose.connection.close();
    } catch (error) {
        console.error("Error in the main run function:", error);
    }
}

/**
 * Shows the contents of the entire database.
 */
async function showDatabaseContents() {
    try {
        const organizations = await Organization.find({}).lean();
        console.log("Organizations and their contents:");
        organizations.forEach((organization) => {
            console.log(JSON.stringify(organization, null, 2));
        });
    } catch (error) {
        console.error("Error showing database contents:", error);
    } finally {
        mongoose.connection.close();
    }
}

/**
 * Clears the entire database.
 */
async function clearDatabase() {
    try {
        await mongoose.connection.db.dropDatabase();
        console.log("Database cleared successfully");
    } catch (error) {
        console.error("Error clearing the database:", error);
    }
}

/**
 * Adds a user with a hashed password to a specific organization.
 * 
 * @param {string} organizationName - Name of the organization.
 * @param {string} organizationPassword - Password to access the organization.
 * @param {string} username - Username of the user to add.
 * @param {string} password - Plain-text password to be hashed for the user.
 */
async function addUserToOrganization(organizationName, organizationPassword, username, password) {
    try {
        if (!await accessOrganization(organizationName, organizationPassword)) return;

        const hashedPassword = await bcrypt.hash(password, 10);
        const organization = await Organization.findOne({ organizationName });
        if (!organization) {
            console.log(`No organization found with the name: ${organizationName}`);
            return;
        }

        organization.users.push({ username, hashedPassword });
        await organization.save();
        console.log(`User ${username} added to organization ${organizationName}`);
    } catch (error) {
        if (error.code === 11000) {
            console.log("Username already exists within the organization.");
        } else {
            console.error("Error adding user to organization:", error);
        }
    }
}

/**
 * Adds a device with a hashed password to a specific organization.
 * 
 * @param {string} organizationName - Name of the organization.
 * @param {string} organizationPassword - Password to access the organization.
 * @param {string} token - Unique token for the device.
 * @param {string} password - Plain-text password to be hashed for the device.
 */
async function addDeviceToOrganization(organizationName, organizationPassword, token, password) {
    try {
        if (!await accessOrganization(organizationName, organizationPassword)) return;

        const hashedPassword = await bcrypt.hash(password, 10);
        const organization = await Organization.findOne({ organizationName });
        if (!organization) {
            console.log(`No organization found with the name: ${organizationName}`);
            return;
        }

        organization.devices.push({ token, hashedPassword });
        await organization.save();
        console.log(`Device ${token} added to organization ${organizationName}`);
    } catch (error) {
        if (error.code === 11000) {
            console.log("Device token already exists within the organization.");
        } else {
            console.error("Error adding device to organization:", error);
        }
    }
}

/**
 * Adds a device to a user's allowed devices list within an organization.
 * 
 * @param {string} organizationName - Name of the organization.
 * @param {string} organizationPassword - Password to access the organization.
 * @param {string} username - Username of the user.
 * @param {string} userPassword - User's password.
 * @param {string} deviceToken - Device token to assign to the user.
 * @param {string} devicePassword - Device's password.
 */
async function addDeviceToUser(organizationName, organizationPassword, username, userPassword, deviceToken, devicePassword) {
    try {
        const organization = await accessOrganization(organizationName, organizationPassword);
        if (!organization) return;

        const user = organization.users.find(user => user.username === username);
        if (!user) {
            console.log(`No user found with the username: ${username} in organization: ${organizationName}`);
            return;
        }

        const userPasswordMatch = await bcrypt.compare(userPassword, user.hashedPassword);
        if (!userPasswordMatch) {
            console.log("Incorrect user password.");
            return;
        }

        const device = organization.devices.find(device => device.token === deviceToken);
        if (!device) {
            console.log(`No device found with the token: ${deviceToken} in organization: ${organizationName}`);
            return;
        }

        const devicePasswordMatch = await bcrypt.compare(devicePassword, device.hashedPassword);
        if (!devicePasswordMatch) {
            console.log("Incorrect device password.");
            return;
        }

        if (!user.allowedDevices.includes(deviceToken)) {
            user.allowedDevices.push(deviceToken);
            await organization.save();
            console.log(`Device ${deviceToken} successfully added to user ${username}.`);
        } else {
            console.log(`Device ${deviceToken} is already assigned to user ${username}.`);
        }

    } catch (error) {
        console.error("Error adding device to user:", error);
    }
}
