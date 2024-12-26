const path = require("path");

module.exports = {
  baseURL: "https://hubspotcallai.integration.mindtickle.com/",
  openAIBatchSize: 50,
  outputCSV: "./data/results.csv",
  authURL: "https://hubspotcallai.integration.mindtickle.com/login",
  username: "sharaj.rewoo@mindtickle.com",//process.env.USERNAME,
  password: "Pass@1213",//process.env.PASSWORD,
  authFilePath: "./playwright/.auth/user.json",
};
