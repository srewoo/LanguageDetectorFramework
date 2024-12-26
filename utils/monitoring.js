const cliProgress = require('cli-progress');
const settings = require('../config/settings');

class ProgressMonitor {
  constructor() {
    this.metrics = {
      startTime: null,
      endTime: null,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheMisses: 0,
      cacheHits: 0,
      averageResponseTime: 0,
      totalResponseTime: 0
    };

    if (settings.monitoring.enableProgressBar) {
      this.progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    }
  }

  startProcess(total) {
    this.metrics.startTime = Date.now();
    if (this.progressBar) {
      this.progressBar.start(total, 0);
    }
  }

  updateProgress(current) {
    if (this.progressBar) {
      this.progressBar.update(current);
    }
  }

  recordRequest(success, responseTime, cached = false) {
    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    if (cached) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
      this.metrics.totalResponseTime += responseTime;
      this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.cacheMisses;
    }
  }

  endProcess() {
    this.metrics.endTime = Date.now();
    if (this.progressBar) {
      this.progressBar.stop();
    }
    return this.getMetrics();
  }

  getMetrics() {
    const duration = this.metrics.endTime - this.metrics.startTime;
    return {
      ...this.metrics,
      duration,
      successRate: (this.metrics.successfulRequests / this.metrics.totalRequests) * 100,
      cacheHitRate: (this.metrics.cacheHits / this.metrics.totalRequests) * 100
    };
  }

  log(level, message) {
    if (settings.monitoring.logLevel === 'debug' || 
        (settings.monitoring.logLevel === 'info' && level !== 'debug') ||
        (settings.monitoring.logLevel === 'warn' && ['warn', 'error'].includes(level)) ||
        (settings.monitoring.logLevel === 'error' && level === 'error')) {
      console[level](message);
    }
  }
}

module.exports = ProgressMonitor;
