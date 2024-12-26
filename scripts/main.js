const {
  authenticate,
  waitForPageLoad,
  saveScreenshot,
  savePageContent,
  cleanupBeforeTestExecution
} = require("../utils.js");
const { chromium } = require("playwright");
const pages = require("../pages.js");
const { baseURL } = require("../config/config.js");
const { detectLanguages } = require("../scripts/detectLanguage.js");

const path = require("path");

(async () => {
  const userDataDir = path.resolve(__dirname, "../user_data");

  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();
  const pageTexts = [];

  try {
    cleanupBeforeTestExecution()
    console.log("Authenticating...");
    await authenticate(browser);

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

    await detectLanguages();
  } catch (error) {
    console.error(`Navigation error: ${error.message}`);
  } finally {
    await browser.close();
  }
})();