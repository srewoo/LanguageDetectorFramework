const {
  waitForPageLoad,
  saveScreenshot,
  savePageContent,
  cleanupBeforeTestExecution,
  captureModalContent
} = require("../utils/utils.js");
const { chromium } = require("playwright");
const pages = require("../pages.js");
const { baseURL } = require("../constants/CONSTANTS.js");
const { authenticate } = require("../config/common.js");
const { detectLanguages } = require("../scripts/detectLanguage.js");
const { shareExternal } = require('../utils/actions/callAI/actions.js');
const path = require("path");


//Navigate to al the pages of pages.js file
const navigateToPages = async (page, pageTexts) => {
  console.log("Starting navigation...");
  for (const { name, path: pagePath } of pages) {
    console.log(`Navigating to: ${name}`);
    await page.goto(`${baseURL}${pagePath}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await waitForPageLoad(page);
    await saveScreenshot(page, name);
    await savePageContent(page, name, pageTexts);
  }
  console.log("Navigation completed.");
};

//Perform actions like external share/add to library
const performActions = async (page, name) => {
  // Navigate to Call Details page
  const callDetails = pages.find(page => page.name === "Call Details");
  if (!callDetails) {
    throw new Error("Call Details page not found in pages.js");
  }
  const callDetailsPath = callDetails.path;

  console.log(`Navigating to Call Details page...`);
  await page.goto(`${baseURL}${callDetailsPath}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // Execute shareExternal function
  await shareExternal(page);
  await saveScreenshot(page, name);

  // Capture the contents of the modal
  const modalContent = await captureModalContent(page);
};


//Test starts here
(async () => {
  const userDataDir = path.resolve(__dirname, "../user_data");

  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1920, height: 1080 },
  });

  // Close any extra tabs (leave only the first one)
  const [page] = browser.pages();
  const pagesList = await browser.pages();
  for (const extraPage of pagesList) {
    if (extraPage !== page) {
      await extraPage.close();  // Close all other tabs
    }
  }

  const pageTexts = [];

  try {
    // Cleanup before test
    cleanupBeforeTestExecution()

    console.log("Authenticating...");
    await authenticate(browser);

    // Navigate to pages
    await navigateToPages(page, pageTexts);

    // Perform actions
    await performActions(page);

    // Detect languages
    await detectLanguages();
    
  } catch (error) {
    console.error(`Navigation error: ${error.message}`);
  } finally {
    await browser.close();
  }
})();
