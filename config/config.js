const path = require("path");

module.exports = {
  baseURL: "https://hubspotcallai.integration.mindtickle.com/",
  openAIBatchSize: 50,
  outputCSV: "./data/results.csv",
  authURL: "https://hubspotcallai.integration.mindtickle.com/login",
  username: process.env.USERNAME || "sharaj.rewoo@mindtickle.com",
  password: process.env.PASSWORD || "Pass@1213",
  authFilePath: "./playwright/.auth/user.json",
};
