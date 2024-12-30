const path = require("path");
const {constants} = require('../constants/CONSTANTS.js');

module.exports = {
  authenticate
};


async function authenticate(context) {
    const page = await context.newPage();
  
    try {
      console.log("Navigating to authentication URL...");
      await page.goto(constants.authURL);
  
      await page.waitForSelector(locators.loginButton, { timeout: 10000 });
      console.log("Performing login...");
      await page.locator(locators.loginButton).click();
      await page.fill(locators.usernameInput, username);
      await page.fill(locators.passwordInput, password);
      await page.locator(locators.signInButton).click();
  
      await page.waitForSelector(locators.callIcon, { timeout: 10000 });
      console.log('Login successful!');
  
      await page.close();
    } catch (error) {
      console.error(`Authentication error: ${error.message}`);
    }
}
