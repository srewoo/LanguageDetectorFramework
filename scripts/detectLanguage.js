const fs = require('fs');
const { OpenAI } = require('openai');
const { RateLimiter, withRetry, captureModalTitleOrHeader } = require('../utils/utils.js');
const { validateSentence, sanitizeInput } = require('../utils/validation');
const ProgressMonitor = require('../utils/monitoring');
const ResultsManager = require('../utils/results');
const settings = require('../config/settings');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const rateLimiter = new RateLimiter(settings.rateLimits.maxRequests, settings.rateLimits.timeWindow);
const progressMonitor = new ProgressMonitor();
const resultsManager = new ResultsManager();
const languageCache = new Map();

async function detectLanguagesFromSentences(data, page) {
  const results = [];
  const { batchSize } = settings;

  try {
    const totalSentences = data.reduce((count, item) => count + (item.content?.length || 0), 0);
    progressMonitor.startProcess(totalSentences);
    let processedSentences = 0;

    progressMonitor.log('info', `Processing ${data.length} items...`);

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchPromises = batch.map(async (item) => {
        const pageName = item.pageName || item["modal title"] || "Unknown Page";
        const content = item.content || [];

        // Log the page object to ensure it's defined
        console.log('Page object:', page);

        const detectionPromises = content.map(async (sentence) => {
          const startTime = Date.now();
          try {
            sentence = sanitizeInput(sentence);
            validateSentence(sentence);

            const cacheKey = `${pageName}:${sentence}`;
            if (languageCache.has(cacheKey)) {
              progressMonitor.recordRequest(true, 0, true);
              processedSentences++;
              progressMonitor.updateProgress(processedSentences);
              return {
                PageName: pageName,
                Sentence: sentence,
                Language: languageCache.get(cacheKey),
              };
            }

            await rateLimiter.throttle();

            const response = await withRetry(
              async () => {
                return await openai.chat.completions.create({
                  model: 'gpt-3.5-turbo',
                  messages: [
                    {
                      role: 'user',
                      content: `Detect the language of this text. Respond with only the language name in lowercase: "${sentence}"`,
                    },
                  ],
                });
              },
              {
                retries: settings.retry.attempts,
                delay: settings.retry.initialDelay,
                backoff: settings.retry.backoffFactor,
                onRetry: (error, attempt) => progressMonitor.log('warn', `Retrying language detection for "${sentence}" (attempt ${attempt})`)
              }
            );

            const detectedLanguage = response.choices[0]?.message?.content?.trim().toLowerCase() || "unknown";
            languageCache.set(cacheKey, detectedLanguage);
            
            progressMonitor.recordRequest(true, Date.now() - startTime);
            processedSentences++;
            progressMonitor.updateProgress(processedSentences);

            return {
              PageName: pageName,
              Sentence: sentence,
              Language: detectedLanguage,
            };
          } catch (error) {
            progressMonitor.log('error', `Error detecting language for sentence: "${sentence}": ${error.message}`);
            progressMonitor.recordRequest(false, Date.now() - startTime);
            processedSentences++;
            progressMonitor.updateProgress(processedSentences);
            return {
              PageName: pageName,
              Sentence: sentence,
              Language: "detection error",
            };
          }
        });

        const pageResults = await Promise.all(detectionPromises);
        results.push(...pageResults);
      });
      await Promise.all(batchPromises);
    }

    const metrics = progressMonitor.endProcess();
    progressMonitor.log('info', 'Processing completed. Metrics:', metrics);

    // Save results in JSON format
    const outputPath = './output/language_detection_results.json';
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    progressMonitor.log('info', `Results saved to: ${outputPath}`);

    return results;
  } catch (error) {
    progressMonitor.log('error', `Error in language detection: ${error.message}`);
    throw error;
  }
}

async function detectLanguages(page) {
  const data = JSON.parse(fs.readFileSync('./data/pageTexts.json'));
  await detectLanguagesFromSentences(data, page);
}

module.exports = {
  detectLanguages,
};