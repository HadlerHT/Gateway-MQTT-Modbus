const mongoose  = require("mongoose");
const bcrypt    = require("bcrypt");

// MongoDB connection URI
const uri = "mongodb://localhost:27017/broker"; // Ensure this is correct

// Connect to MongoDB
mongoose
    .connect(uri, {
        // useNewUrlParser: true,
        // useUnifiedTopology: true
    })
    .then(() => {
        console.log("Connected to MongoDB");
        run(); // Start the main sequence after connecting
    })
    .catch((error) => {
        console.error("Error connecting to MongoDB:", error);
    });

    // Function to find and display all organizations
async function findOrganizations() {
    try {
        console.log("Finding all organizations...");
        const organizations = await Organizations.find({}).lean();
        organizations.forEach((organization) => {
            console.log(organization.organizationName); // Output organization names
        });
    } catch (error) {
        console.error("Error finding organizations:", error);
    }
}


async function run() {
    try {
        console.log("Clearing the database...");
        await clearDatabase();

        console.log("Adding organizations sequentially...");
        await addOrganizationsSequentially();

        console.log("Adding a user to the organization...");
        await addUserToOrganization('Organization_3', 'hadler', 'password');

        console.log("Adding a device to the organization...");
        await addDeviceToOrganization('Organization_3', 'esp#1', 'esp-password');

        console.log("Finding and displaying all organizations...");
        await findOrganizations();

        // console.log("Closing MongoDB connection...");
        // mongoose.connection.close();
    } catch (error) {
        console.error("Error in the main run function:", error);
    }
}