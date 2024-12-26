const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const xml2js = require('xml2js');
const settings = require('../config/settings');

class ResultsManager {
  constructor(outputDir = './output') {
    this.outputDir = outputDir;
    fs.mkdirSync(outputDir, { recursive: true });
  }

  async saveResults(results, format = settings.defaultFormat) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `language_detection_${timestamp}`;
    
    let content;
    let extension;
    
    switch (format.toLowerCase()) {
      case 'json':
        content = JSON.stringify(results, null, 2);
        extension = 'json';
        break;
      
      case 'xml':
        const builder = new xml2js.Builder({
          rootName: 'LanguageDetectionResults',
          renderOpts: { pretty: true, indent: '  ' }
        });
        content = builder.buildObject({ results });
        extension = 'xml';
        break;
      
      case 'csv':
      default:
        content = this.convertToCsv(results);
        extension = 'csv';
        break;
    }

    const outputPath = path.join(this.outputDir, `${filename}.${extension}`);
    
    // Check if compression is needed
    if (settings.compression.enabled && Buffer.byteLength(content) > settings.compression.threshold) {
      const compressedContent = await this.compressContent(content);
      fs.writeFileSync(`${outputPath}.gz`, compressedContent);
      return `${outputPath}.gz`;
    } else {
      fs.writeFileSync(outputPath, content);
      return outputPath;
    }
  }

  convertToCsv(results) {
    const headers = ['PageName', 'Sentence', 'Language'];
    const rows = results.map(result => [
      this.escapeCsvField(result.PageName),
      this.escapeCsvField(result.Sentence),
      this.escapeCsvField(result.Language)
    ]);
    
    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }

  escapeCsvField(field) {
    if (typeof field !== 'string') return `"${field}"`;
    if (field.includes('"') || field.includes(',') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  async compressContent(content) {
    return new Promise((resolve, reject) => {
      zlib.gzip(content, (error, compressed) => {
        if (error) reject(error);
        else resolve(compressed);
      });
    });
  }

  filterResults(results, filters) {
    return results.filter(result => {
      for (const [key, value] of Object.entries(filters)) {
        if (result[key] !== value) return false;
      }
      return true;
    });
  }

  sortResults(results, sortBy, ascending = true) {
    return [...results].sort((a, b) => {
      const compareValue = ascending ? 1 : -1;
      if (a[sortBy] < b[sortBy]) return -1 * compareValue;
      if (a[sortBy] > b[sortBy]) return 1 * compareValue;
      return 0;
    });
  }
}

module.exports = ResultsManager;
