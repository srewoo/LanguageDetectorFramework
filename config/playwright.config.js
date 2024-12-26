
const { devices } = require("@playwright/test");

module.exports = {
  timeout: 60000,
  baseURL: "https://hubspotcallai.integration.mindtickle.com",
  projects: [
    {
      name: "Desktop Chrome",
      use: {
        browserName: "chromium",
        headless: false,
        viewport: { width: 1920, height: 1080 },
        userDataDir: "./user_data", // Ensure this path exists
        locale: "en-US",
        //geolocation: { latitude: 37.7749, longitude: -122.4194 }, // Example: San Francisco
        permissions: ["geolocation", "Camera"],
      },
    },
  ],
};