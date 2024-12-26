const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { authURL, username, password } = require('./config/config');

async function authenticate(context) {
  const page = await context.newPage();

  try {
    console.log("Navigating to authentication URL...");
    await page.goto(authURL);

    await page.waitForSelector('button[type="button"] span', { timeout: 10000 });
    console.log("Performing login...");
    await page.locator('button[type="button"] span').click();
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await page.waitForSelector('.icon.icon-phoneCall.learner-header-menu-item-icon', { timeout: 10000 });
    console.log('Login successful!');

    await page.close();
  } catch (error) {
    console.error(`Authentication error: ${error.message}`);
  }
}

async function waitForPageLoad(page) {
  console.log('Waiting for page to fully load...');
  //await page.waitForLoadState('networkidle');  
  await page.waitForLoadState('load');
  await page.waitForTimeout(3000);
  console.log('Page fully loaded.');
}

async function saveScreenshot(page, pageName) {
  const filePath = `./data/screenshots/${pageName}.png`;
  console.log(`Saving screenshot to: ${filePath}`);
  await page.screenshot({ path: filePath, fullPage: true });
}

async function getVisibleTextElements() {
  console.log("Starting visible text extraction from page...");

  try {
    // Define helper function to check visibility
    function isVisible(el) {
      const style = getComputedStyle(el);
      return (
        el.offsetParent !== null &&
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        parseFloat(style.opacity) > 0
      );
    }

    // Select all elements that may contain text
    const elements = document.querySelectorAll("*");

    const visibleTexts = [];

    elements.forEach(el => {
      if (isVisible(el)) {
        // Extract direct text nodes
        const directTextNodes = Array.from(el.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent?.trim())
          .filter(Boolean);

        // Add direct text nodes to the result
        visibleTexts.push(...directTextNodes);

        // If the element has no children, process the full text content
        if (!el.children.length) {
          const fullText = el.textContent?.trim();
          if (fullText) visibleTexts.push(fullText);
        }
      }
    });

    // Remove duplicates and empty strings
    const uniqueTexts = [...new Set(visibleTexts)].filter(text => text.length > 0);

    console.log(`Extracted ${uniqueTexts.length} unique text elements.`);
    return uniqueTexts;

  } catch (error) {
    console.error("Error extracting visible text elements:", error);
    return [];
  }
}

async function savePageContent(page, pageName, texts) {
  console.log(`Saving visible content for ${pageName}`);

  // Call getVisibleTextElements in the page context
  const elementsText = await page.evaluate(getVisibleTextElements);

  texts.push({ pageName, content: elementsText });
  const filePath = './data/pageTexts.json';
  fs.writeFileSync(filePath, JSON.stringify(texts, null, 2));
  console.log(`Content saved to ${filePath}`);
}

async function cleanupBeforeTestExecution() {
  const pathsToCheck = [
    './data/screenshots',
    './data/pageTexts.json',
    './output'
  ];

  for (const filePath of pathsToCheck) {
    try {
      if (fs.existsSync(filePath)) {
        if (fs.lstatSync(filePath).isDirectory()) {
          if (filePath === './output') {
            // If it's the output directory, delete its contents
            const files = fs.readdirSync(filePath);
            for (const file of files) {
              const fileToDelete = path.join(filePath, file);
              fs.lstatSync(fileToDelete).isDirectory() ? fs.rmSync(fileToDelete, { recursive: true }) : fs.unlinkSync(fileToDelete);
              console.log(`Deleted content: ${fileToDelete}`);
            }
          } else {
            // If it's another directory, delete it
            fs.rmSync(filePath, { recursive: true });
            console.log(`Deleted directory: ${filePath}`);
          }
        } else {
          // If it's a file, delete it
          fs.unlinkSync(filePath);
          console.log(`Deleted file: ${filePath}`);
        }
      }
    } catch (error) {
      console.error(`Error checking or deleting ${filePath}:`, error);
    }
  }
}

// Rate limiter implementation
class RateLimiter {
  constructor(maxRequests, timeWindow) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }

  async throttle() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.timeWindow - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requests.push(now);
  }
}

// Retry mechanism
async function withRetry(fn, options = {}) {
  const {
    retries = 3,
    delay = 1000,
    backoff = 2,
    onRetry = (error, attempt) => console.log(`Retry attempt ${attempt} after error: ${error.message}`)
  } = options;

  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;

      onRetry(error, attempt);
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(backoff, attempt - 1)));
    }
  }
  throw lastError;
}

module.exports = {
  authenticate,
  waitForPageLoad,
  saveScreenshot,
  savePageContent,
  cleanupBeforeTestExecution,
  RateLimiter,
  withRetry
};