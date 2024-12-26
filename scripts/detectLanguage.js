const fs = require('fs');
const { OpenAI } = require('openai');
const { RateLimiter, withRetry } = require('../utils');
const { validateSentence, sanitizeInput } = require('../utils/validation');
const ProgressMonitor = require('../utils/monitoring');
const ResultsManager = require('../utils/results');
const settings = require('../config/settings');
require('dotenv').config();

// Initialize OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize components
const rateLimiter = new RateLimiter(settings.rateLimits.maxRequests, settings.rateLimits.timeWindow);
const progressMonitor = new ProgressMonitor();
const resultsManager = new ResultsManager();

// In-memory cache for language detection results
const languageCache = new Map();

async function detectLanguagesFromSentences(data) {
  const results = [];
  const { batchSize } = settings;

  try {
    const totalSentences = data.reduce((count, { content }) => count + content.length, 0);
    progressMonitor.startProcess(totalSentences);
    let processedSentences = 0;

    progressMonitor.log('info', `Processing ${data.length} pages...`);

    // Process pages in batches
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchPromises = batch.map(async ({ pageName, content }) => {
        const detectionPromises = content.map(async (sentence) => {
          const startTime = Date.now();
          
          try {
            // Validate and sanitize input
            sentence = sanitizeInput(sentence);
            validateSentence(sentence);

            // Check cache first
            const cacheKey = `${pageName}:${sentence}`;
            if (languageCache.has(cacheKey)) {
              progressMonitor.recordRequest(true, 0, true);
              processedSentences++;
              progressMonitor.updateProgress(processedSentences);
              return { PageName: pageName, Sentence: sentence, Language: languageCache.get(cacheKey) };
            }

            // Apply rate limiting
            await rateLimiter.throttle();

            // Use retry mechanism for API calls
            const response = await withRetry(
              async () => {
                return await openai.chat.completions.create({
                  model: 'gpt-3.5-turbo',
                  messages: [
                    {
                      role: 'user',
                      content: `You are an expert language detection assistant. Analyze the following sentence and detect all languages present. Respond only with the detected languages separated by commas. Here is the sentence: "${sentence}"`,
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

            const detectedLanguages = response.choices[0]?.message?.content?.trim() || "Unknown";
            const responseTime = Date.now() - startTime;
            
            // Cache the result
            languageCache.set(cacheKey, detectedLanguages);
            
            progressMonitor.recordRequest(true, responseTime);
            processedSentences++;
            progressMonitor.updateProgress(processedSentences);

            return { PageName: pageName, Sentence: sentence, Language: detectedLanguages };
          } catch (error) {
            progressMonitor.log('error', `Error detecting language for sentence: "${sentence}": ${error.message}`);
            progressMonitor.recordRequest(false, Date.now() - startTime);
            processedSentences++;
            progressMonitor.updateProgress(processedSentences);
            return { PageName: pageName, Sentence: sentence, Language: "Detection error" };
          }
        });

        const pageResults = await Promise.all(detectionPromises);
        results.push(...pageResults);
      });
      await Promise.all(batchPromises);
    }

    // Get final metrics
    const metrics = progressMonitor.endProcess();
    progressMonitor.log('info', 'Processing completed. Metrics:', metrics);

    // Save results in all supported formats
    for (const format of settings.outputFormats) {
      const outputPath = await resultsManager.saveResults(results, format);
      progressMonitor.log('info', `Results saved in ${format} format: ${outputPath}`);
    }

    return results;
  } catch (error) {
    progressMonitor.log('error', `Error in language detection: ${error.message}`);
    throw error;
  }
}

async function detectLanguages() {
  const data = JSON.parse(fs.readFileSync('./data/pageTexts.json'));
  await detectLanguagesFromSentences(data);
}

module.exports = {
  detectLanguages,
};