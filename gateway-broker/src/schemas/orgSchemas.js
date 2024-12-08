/**
 * Organization Schema - MongoDB Schema for Modbus IoT Integration System
 * -----------------------------------------------------------------------
 * 
 * This module defines a Mongoose schema for `Organization`, which includes nested schemas
 * for `User` and `Device`. The schema is used to store and manage data related to
 * organizations, their authorized users, and registered devices within the MQTT-Modbus
 * gateway system.
 *
 * Schema Structure:
 * - **User Schema**: Contains fields for `username`, `hashedPassword`, and an array of
 *   `allowedDevices` topics they are permitted to subscribe to.
 * - **Device Schema**: Contains fields for `token` and `hashedPassword` for device
 *   authentication within an organization.
 * - **Organization Schema**: Top-level schema with `organizationName`, `hashedPassword`,
 *   and nested `users` and `devices` arrays to manage access control.
 *
 * Usage:
 * - The `Organization` schema is instantiated in the database to manage users and devices,
 *   allowing access to specific Modbus devices by enforcing organization-level security.
 *
 * Dependencies:
 * - `mongoose`: MongoDB object modeling tool for Node.js.
 *
 * Example:
 * ----------------
 * const Organization = require('./path/to/organizationSchema');
 * const newOrg = new Organization({
 *   organizationName: "ExampleOrg",
 *   hashedPassword: "hashed_password_value",
 *   users: [{ username: "user1", hashedPassword: "hashed_pw", allowedDevices: ["device1"] }],
 *   devices: [{ token: "device_token", hashedPassword: "hashed_pw" }]
 * });
 *
 * Author: TEMPESTA, H. H.
 * Date: Oct 31st 2024
 */

const mongoose = require('mongoose');

// Define user schema for individual user permissions within an organization
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    hashedPassword: { type: String, required: true },
    allowedDevices: [String]  // Topics they are allowed to subscribe to
});

// Define device schema for registered devices within an organization
const deviceSchema = new mongoose.Schema({
    token: { type: String, required: true },
    hashedPassword: { type: String, required: true },
});

// Define main organization schema with users and devices for access control
const organizationSchema = new mongoose.Schema({
    organizationName: { type: String, required: true, unique: true },
    hashedPassword: { type: String, required: true }, // Organization's hashed password
    users: { type: [userSchema], default: [] },
    devices: { type: [deviceSchema], default: [] },
});

// Export the Organization model
const Organization = mongoose.model('Organization', organizationSchema);

module.exports = Organization;
