module.exports = {
  // Processing configuration
  batchSize: 5,
  rateLimits: {
    maxRequests: 3,
    timeWindow: 1000
  },
  retry: {
    attempts: 3,
    initialDelay: 1000,
    backoffFactor: 2
  },

  // Output configuration
  outputFormats: ['csv', 'json', 'xml'],
  defaultFormat: 'json',
  compression: {
    enabled: true,
    threshold: 1024 * 1024, // 1MB
  },

  // Content validation
  validation: {
    maxSentenceLength: 1000,
    minSentenceLength: 1,
    allowedCharacters: /^[\p{L}\p{N}\p{P}\s]+$/u,
  },

  // Progress monitoring
  monitoring: {
    enableProgressBar: true,
    logLevel: 'info', // 'debug' | 'info' | 'warn' | 'error'
    metrics: {
      collect: true,
      detailed: true
    }
  }
};
