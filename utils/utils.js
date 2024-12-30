const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { authURL, username, password } = require('../config/common.js');
const locators = require('../locators/callAI/locator.js');


async function waitForPageLoad(page) {
  console.log('Waiting for page to fully load...');
  await page.waitForLoadState('load');
  await page.waitForTimeout(3000);
  console.log('Page fully loaded.');
}

async function saveScreenshot(page, pageName, modalTitle) {
  const screenshotName = modalTitle || pageName;
  const fileName = `${screenshotName}.png`;
  const filePath = `./data/screenshots/${fileName}`;
  
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

//Saved the unique text elements
async function savePageContent(page, pageName, texts) {
  console.log(`Saving visible content for ${pageName}`);

  // Call getVisibleTextElements in the page context
  const elementsText = await page.evaluate(getVisibleTextElements);

  texts.push({ pageName, content: elementsText });
  const filePath = './data/pageTexts.json';
  fs.writeFileSync(filePath, JSON.stringify(texts, null, 2));
  console.log(`Content saved to ${filePath}`);
}

//Capture the contents of the modal
async function captureModalContent(page) {
    // ADD MORE SELECTORS
    const modalSelectors = [
        '.cai-modal-body',
        '[role="dialog"]',
        '.modal',
        '.popup',
        '.dialog',
    ];

    // Capture modal content
    const { modalTitle, modalContent } = await page.evaluate((selectors) => {
        const modal = selectors
            .map(selector => document.querySelector(selector))
            .find(el => el !== null); // Find the first visible modal

        const title = modal ? modal.querySelector('h1, .modal-title, .popup-title')?.innerText.trim() || 'Untitled' : 'No modal found';
        const content = modal ? modal.innerText.trim() : 'No content available';
        return { modalTitle: title, modalContent: content };
    }, modalSelectors);

    // File path to save data
    const pageTextsPath = './data/pageTexts.json';

    // Read or initialize the JSON file
    let pageTexts = [];
    if (fs.existsSync(pageTextsPath)) {
        const data = fs.readFileSync(pageTextsPath, 'utf-8');
        pageTexts = JSON.parse(data);
    }

    // Transform the modal content and save it
    const transformedContent = {
        "modal title": modalTitle,
        "content": modalContent.split('\n') // Split the content into an array
    };

    // Append transformed content to the pageTexts array
    pageTexts.push(transformedContent);

    // Write updated data back to the JSON file
    fs.writeFileSync(pageTextsPath, JSON.stringify(pageTexts, null, 2), 'utf-8');

    return transformedContent;
}

//Cleanup before test: delete screenshots, pageTexts.json, and output
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

  // Throttle requests
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
  waitForPageLoad,
  saveScreenshot,
  savePageContent,
  captureModalContent,
  cleanupBeforeTestExecution,
  RateLimiter,
  withRetry
};