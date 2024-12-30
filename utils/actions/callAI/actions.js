const locators = require('../../../locators/callAI/locator.js');
const constants = require('../../../constants/CONSTANTS.js');

// Function to generate a random email
function generateRandomEmail() {
    const randomString = Math.random().toString(36).substring(2, 15);
    return `${randomString}@example.com`;
}

async function shareExternal(page) {
    await page.click(locators.shareBtnRecDetails);
    await page.click(locators.shareOutsideOrg);
    await page.click(locators.shareEmailfield, { force: true });

    // Generate a random email every time
    const randomEmail = generateRandomEmail();
    await page.locator(locators.extshareEmailSelect).type(randomEmail);
    //await page.waitForTimeout(3000);
    await page.keyboard.press("Enter");

    await page.fill(locators.shareTextfield, constants.randomText);
    await page.click(locators.shareCompleteRecording);
    await page.click(locators.shareSend, { force: true });
}

module.exports = {
    shareExternal,
};