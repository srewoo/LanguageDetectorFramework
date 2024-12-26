const settings = require('../config/settings');

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

function validateSentence(sentence) {
  if (typeof sentence !== 'string') {
    throw new ValidationError('Input must be a string');
  }

  const { maxSentenceLength, minSentenceLength, allowedCharacters } = settings.validation;

  if (sentence.length > maxSentenceLength) {
    throw new ValidationError(`Sentence exceeds maximum length of ${maxSentenceLength} characters`);
  }

  if (sentence.length < minSentenceLength) {
    throw new ValidationError(`Sentence is shorter than minimum length of ${minSentenceLength} characters`);
  }

  if (!allowedCharacters.test(sentence)) {
    throw new ValidationError('Sentence contains invalid characters');
  }

  return sentence.trim();
}

function sanitizeInput(input) {
  return input
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/[^\p{L}\p{N}\p{P}\s]/gu, '') // Keep only letters, numbers, punctuation, and whitespace
    .trim();
}

module.exports = {
  validateSentence,
  sanitizeInput,
  ValidationError
};
