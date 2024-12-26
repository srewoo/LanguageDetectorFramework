const path = require("path");

module.exports = {
  baseURL: "https://hubspotcallai.integration.mindtickle.com/",
  openAIBatchSize: 50,
  outputCSV: "./data/results.csv",
  authURL: "https://hubspotcallai.integration.mindtickle.com/login",
  username: process.env.USERNAME,
  password: process.env.PASSWORD,
  authFilePath: "./playwright/.auth/user.json",
};
