import nlp from 'compromise';
import * as fs from 'fs';
import * as path from 'path';
import { createWorker } from 'tesseract.js';

/**
 * OCR Service for extracting text from images using Tesseract.js
 */
export class OcrService {
  private static instance: OcrService;
  private worker: any = null;

  private constructor() {}

  static getInstance(): OcrService {
    if (!OcrService.instance) {
      OcrService.instance = new OcrService();
    }
    return OcrService.instance;
  }

  /**
   * Initialize the OCR worker
   */
  async initialize(): Promise<void> {
    if (!this.worker) {
      console.log('Initializing OCR worker...');
      this.worker = await createWorker('deu+eng'); // German + English
    }
  }

  /**
   * Perform OCR on an image file and return extracted text
   */
  async recognizeImage(imagePath: string): Promise<string> {
    try {
      if (!this.worker) {
        await this.initialize();
      }

      console.log(`Running OCR on: ${imagePath}`);
      const {
        data: { text },
      } = await this.worker.recognize(imagePath);
      return text;
    } catch (error: any) {
      console.error(`OCR error for ${imagePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Perform OCR on an image and analyze the text
   */
  async recognizeAndAnalyze(imagePath: string): Promise<{
    text: string;
    analysis: any;
  }> {
    try {
      const text = await this.recognizeImage(imagePath);

      // Analyze the extracted text
      console.log('[OCR Analysis] Starting text analysis...');
      const analysis = this.analyzeText(text);

      console.log('\n=== OCR TEXT ANALYSIS RESULTS ===');
      console.log(`Sender: ${analysis.sender}`);
      console.log(
        `People detected: ${analysis.people?.length > 0 ? analysis.people.join(', ') : 'None'}`,
      );
      console.log(
        `Organizations detected: ${analysis.organizations?.length > 0 ? analysis.organizations.join(', ') : 'None'}`,
      );
      console.log(
        `Locations detected: ${analysis.places?.length > 0 ? analysis.places.join(', ') : 'None'}`,
      );
      console.log(
        `Dates found: ${analysis.dates?.length > 0 ? analysis.dates.join(', ') : 'None'}`,
      );
      console.log(
        `Websites: ${analysis.websites?.length > 0 ? analysis.websites.join(', ') : 'None'}`,
      );
      console.log(
        `Email addresses: ${analysis.emails?.length > 0 ? analysis.emails.join(', ') : 'None'}`,
      );
      console.log(
        `Domains found: ${analysis.domains?.length > 0 ? analysis.domains.join(', ') : 'None'}`,
      );
      console.log(
        `Full names found: ${analysis.fullNames?.length > 0 ? analysis.fullNames.join(', ') : 'None'}`,
      );
      console.log(`Subject: ${analysis.subject}`);
      console.log(`Keywords: ${analysis.keywords?.join(', ')}`);
      console.log('\n--- ID/Number Sequences Found ---');
      if (analysis.numberSequences?.length > 0) {
        analysis.numberSequences.forEach(
          (
            item: { sequence: string; context: string; type: string },
            index: number,
          ) => {
            console.log(`${index + 1}. [${item.type}] ${item.sequence}`);
            console.log(`   Context: ${item.context}`);
          },
        );
      } else {
        console.log('No long number sequences found.');
      }
      console.log('\n--- Text Statistics ---');
      console.log(`Total characters: ${analysis.statistics?.totalCharacters}`);
      console.log(`Total lines: ${analysis.statistics?.totalLines}`);
      console.log(`Total sentences: ${analysis.statistics?.totalSentences}`);
      console.log(
        `Average line length: ${analysis.statistics?.averageLineLength} chars`,
      );
      console.log('================================\n');

      return { text, analysis };
    } catch (error: any) {
      console.error(`OCR and analysis error for ${imagePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Perform OCR on all images and return combined text
   */
  async recognizeImages(imagePaths: string[]): Promise<string> {
    try {
      if (!this.worker) {
        await this.initialize();
      }

      const allTexts: string[] = [];

      for (let i = 0; i < imagePaths.length; i++) {
        const imagePath = imagePaths[i];
        console.log(
          `[OCR] Processing image ${i + 1}/${imagePaths.length}: ${path.basename(imagePath)}`,
        );
        console.log(`[OCR] Starting text recognition...`);

        const {
          data: { text },
        } = await this.worker.recognize(imagePath);

        console.log(
          `[OCR] Extracted ${text.length} characters from page ${i + 1}`,
        );
        allTexts.push(text);
      }

      console.log(
        `[OCR] Text extraction complete. Total length: ${allTexts.join('').length} chars`,
      );
      return allTexts.join('\n---PAGE BREAK---\n');
    } catch (error: any) {
      console.error('OCR error:', error.message);
      throw error;
    }
  }

  /**
   * Save extracted text to a file
   */
  async saveTextToFile(
    imagePaths: string[],
    outputPdfPath: string,
  ): Promise<string> {
    const extractedText = await this.recognizeImages(imagePaths);
    const textFilePath = outputPdfPath.replace(/\.pdf$/i, '.txt');

    console.log(`Saving OCR text to: ${textFilePath}`);
    fs.writeFileSync(textFilePath, extractedText, 'utf-8');

    // Analyze the extracted text
    console.log('[OCR Analysis] Starting text analysis...');
    const analysis = this.analyzeText(extractedText);

    console.log('\n=== OCR TEXT ANALYSIS RESULTS ===');
    console.log(`Sender: ${analysis.sender}`);
    console.log(
      `People detected: ${analysis.people?.length > 0 ? analysis.people.join(', ') : 'None'}`,
    );
    console.log(
      `Organizations detected: ${analysis.organizations?.length > 0 ? analysis.organizations.join(', ') : 'None'}`,
    );
    console.log(
      `Locations detected: ${analysis.places?.length > 0 ? analysis.places.join(', ') : 'None'}`,
    );
    console.log(
      `Dates found: ${analysis.dates?.length > 0 ? analysis.dates.join(', ') : 'None'}`,
    );
    console.log(
      `Websites: ${analysis.websites?.length > 0 ? analysis.websites.join(', ') : 'None'}`,
    );
    console.log(
      `Email addresses: ${analysis.emails?.length > 0 ? analysis.emails.join(', ') : 'None'}`,
    );
    console.log(
      `Domains found: ${analysis.domains?.length > 0 ? analysis.domains.join(', ') : 'None'}`,
    );
    console.log(`Subject: ${analysis.subject}`);
    console.log(`Keywords: ${analysis.keywords?.join(', ')}`);
    console.log('\n--- ID/Number Sequences Found ---');
    if (analysis.numberSequences?.length > 0) {
      analysis.numberSequences.forEach(
        (
          item: { sequence: string; context: string; type: string },
          index: number,
        ) => {
          console.log(`${index + 1}. [${item.type}] ${item.sequence}`);
          console.log(`   Context: ${item.context}`);
        },
      );
    } else {
      console.log('No long number sequences found.');
    }
    console.log('\n--- Text Statistics ---');
    console.log(`Total characters: ${analysis.statistics?.totalCharacters}`);
    console.log(`Total lines: ${analysis.statistics?.totalLines}`);
    console.log(`Total sentences: ${analysis.statistics?.totalSentences}`);
    console.log(
      `Average line length: ${analysis.statistics?.averageLineLength} chars`,
    );
    console.log('================================\n');

    return textFilePath;
  }

  /**
   * Extract dates from text in various formats
   */
  private extractDates(text: string): string[] {
    const dates: string[] = [];

    // German date format: DD.MM.YYYY or DD.MM.YY
    const germanDatePattern = /\b(\d{1,2})[.\s]+(\d{1,2})[.\s]+(\d{2,4})\b/g;
    let match;
    while ((match = germanDatePattern.exec(text)) !== null) {
      dates.push(match[0]);
    }

    // ISO format: YYYY-MM-DD
    const isoDatePattern = /\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/g;
    while (
      ((isoDatePattern.lastIndex = 0),
      (match = isoDatePattern.exec(text)) !== null)
    ) {
      const dateStr = match[0];
      if (!dates.includes(dateStr)) {
        dates.push(dateStr);
      }
    }

    // English/US format: MM/DD/YYYY or M/D/YY
    const usDatePattern = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/g;
    while (
      ((usDatePattern.lastIndex = 0),
      (match = usDatePattern.exec(text)) !== null)
    ) {
      const dateStr = match[0];
      if (!dates.includes(dateStr)) {
        dates.push(dateStr);
      }
    }

    // German month names: January - Dezember
    const monthNames = [
      'januar|february|märz|april|mai|juni|juli|august|september|oktober|november|dezember',
      'jan|feb|mär|apr|mai|jun|jul|aug|sep|okt|nov|dez',
      'january|february|march|april|may|june|july|august|september|october|november|december',
      'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec',
    ].join('|');
    const monthDatePattern = new RegExp(
      `\\b(\\d{1,2})\\s+(${monthNames})\\s+(\\d{4}|\\d{2})\\b`,
      'gi',
    );
    while ((match = monthDatePattern.exec(text)) !== null) {
      const dateStr = match[0];
      if (!dates.includes(dateStr)) {
        dates.push(dateStr);
      }
    }

    // Remove duplicates and return unique dates
    return Array.from(new Set(dates));
  }

  /**
   * Extract long number sequences (>8 characters) with context
   * Detects account numbers, insurance numbers, and other IDs
   */
  private extractNumberSequences(text: string): Array<{
    sequence: string;
    context: string;
    type: string;
  }> {
    const results: Array<{ sequence: string; context: string; type: string }> =
      [];
    const seen = new Set<string>();

    // Split text into lines for better context extraction
    const lines = text.split('\n');

    for (const line of lines) {
      // Pattern 1: Pure numeric sequences (8+ digits) - Account numbers, customer IDs
      const numericPattern = /\b(\d{8,})\b/g;
      let match;
      while ((match = numericPattern.exec(line)) !== null) {
        // Extract the whole string from blank to blank
        const wholeString = this.extractWholeStringBetweenBlanks(
          line,
          match.index,
        );
        if (!seen.has(wholeString)) {
          seen.add(wholeString);
          const context = this.extractContext(line, match.index, match[1]);
          results.push({
            sequence: wholeString,
            context: context,
            type: 'numeric_id',
          });
        }
      }

      // Pattern 2: Alphanumeric sequences (8+ chars with mix of letters and numbers)
      const alphanumericPattern = /\b([A-Z0-9]{8,})\b/gi;
      while ((match = alphanumericPattern.exec(line)) !== null) {
        const sequence = match[1];
        if (/\d/.test(sequence) && /[A-Z]/i.test(sequence)) {
          const wholeString = this.extractWholeStringBetweenBlanks(
            line,
            match.index,
          );
          if (!seen.has(wholeString)) {
            seen.add(wholeString);
            const context = this.extractContext(line, match.index, sequence);
            results.push({
              sequence: wholeString,
              context: context,
              type: 'alphanumeric_id',
            });
          }
        }
      }

      // Pattern 3: German IBAN format (DE followed by 20 digits)
      const ibanPattern = /\b(DE\d{20})\b/gi;
      while ((match = ibanPattern.exec(line)) !== null) {
        const wholeString = this.extractWholeStringBetweenBlanks(
          line,
          match.index,
        );
        if (!seen.has(wholeString)) {
          seen.add(wholeString);
          const context = this.extractContext(line, match.index, match[1]);
          results.push({
            sequence: wholeString,
            context: context,
            type: 'iban',
          });
        }
      }

      // Pattern 4: Numbers with spaces or dashes (already formatted)
      const formattedNumberPattern =
        /\b(\d{2,}[\s\-]\d{2,}[\s\-]\d{2,}(?:[\s\-]\d{2,})*)\b/g;
      while ((match = formattedNumberPattern.exec(line)) !== null) {
        const sequence = match[1];
        const cleanSequence = sequence.replace(/[\s\-]/g, '');
        if (cleanSequence.length >= 8) {
          const wholeString = this.extractWholeStringBetweenBlanks(
            line,
            match.index,
          );
          if (!seen.has(wholeString)) {
            seen.add(wholeString);
            const context = this.extractContext(line, match.index, sequence);
            results.push({
              sequence: wholeString,
              context: context,
              type: 'formatted_number',
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Extract the whole string between blanks (whitespace boundaries)
   * Returns the complete text segment containing the match
   */
  private extractWholeStringBetweenBlanks(
    line: string,
    matchIndex: number,
  ): string {
    // Find the start (previous blank/space or line start)
    let start = matchIndex;
    while (start > 0 && line[start - 1] !== ' ' && line[start - 1] !== '\t') {
      start--;
    }

    // Find the end (next blank/space or line end)
    let end = matchIndex;
    while (end < line.length && line[end] !== ' ' && line[end] !== '\t') {
      end++;
    }

    return line.substring(start, end).trim();
  }

  /**
   * Extract context around a matched sequence
   * Returns text between spaces surrounding the match
   */
  private extractContext(
    line: string,
    matchIndex: number,
    sequence: string,
  ): string {
    // Find the start of the context (previous space or line start)
    let contextStart = matchIndex;
    while (contextStart > 0 && line[contextStart - 1] !== ' ') {
      contextStart--;
    }

    // Find the end of the context (next space or line end)
    let contextEnd = matchIndex + sequence.length;
    while (contextEnd < line.length && line[contextEnd] !== ' ') {
      contextEnd++;
    }

    // Expand context to include surrounding words (up to 50 chars before and after)
    const expandStart = Math.max(0, contextStart - 50);
    const expandEnd = Math.min(line.length, contextEnd + 50);

    let context = line.substring(expandStart, expandEnd).trim();

    // Add ellipsis if truncated
    if (expandStart > 0) context = '...' + context;
    if (expandEnd < line.length) context = context + '...';

    return context;
  }

  /**
   * Extract URLs, websites, and email domains from text
   */
  private extractWebsitesAndEmails(text: string): {
    websites: string[];
    emails: string[];
    domains: string[];
  } {
    const websites: string[] = [];
    const emails: string[] = [];
    const domains = new Set<string>();

    // Extract URLs with http(s) protocol
    const urlPattern = /https?:\/\/[^\s]+/gi;
    let match;
    while ((match = urlPattern.exec(text)) !== null) {
      let url = match[0].replace(/[.,;:!?)]+$/, ''); // Remove trailing punctuation
      if (!websites.includes(url)) {
        websites.push(url);
        // Extract domain from URL
        try {
          let domain = new URL(url).hostname;
          if (domain) {
            domain = domain.split('/')[0]; // Remove any path components
            domains.add(domain);
          }
        } catch (e) {
          // Invalid URL, skip
        }
      }
    }

    // Extract www. addresses
    const wwwPattern = /www\.[^\s,;:!?()[\]{}]+/gi;
    while ((match = wwwPattern.exec(text)) !== null) {
      let url = match[0].replace(/[.,;:!?)]+$/, ''); // Remove trailing punctuation
      // Remove path from www address
      const pathIndex = url.indexOf('/');
      if (pathIndex > 0) {
        url = url.substring(0, pathIndex);
      }
      if (!websites.includes(url)) {
        websites.push(url);
        // Extract domain without www.
        let domain = url.replace(/^www\./, '').replace(/^https?:\/\//, '');
        // Remove any remaining path
        const domainPathIndex = domain.indexOf('/');
        if (domainPathIndex > 0) {
          domain = domain.substring(0, domainPathIndex);
        }
        if (domain) domains.add(domain);
      }
    }

    // Extract email addresses
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
    while ((match = emailPattern.exec(text)) !== null) {
      const email = match[0].toLowerCase();
      if (!emails.includes(email)) {
        emails.push(email);
        // Extract domain from email and remove any trailing slashes/paths
        let domain = email.split('@')[1];
        if (domain) {
          domain = domain.split('/')[0]; // Remove path if present
          domains.add(domain);
        }
      }
    }

    return {
      websites: websites,
      emails: emails,
      domains: Array.from(domains),
    };
  }

  /**
   * Analyze extracted text for sender and other information
   */
  private analyzeText(text: string): any {
    const analysisStartTime = Date.now();
    const timings: Record<string, number> = {};

    try {
      // Basic sender extraction using regex patterns (with German umlaut support)
      const senderStartTime = Date.now();
      const senderPatterns = [
        /(?:from|sender|von|absender|von:|sender:)\s*[:\s]*([^\n]+)/gi,
        /^([\wäöüßÄÖÜ\s.,\-']+)\s*$/m, // Name at beginning with umlaut support
        /^([A-Z][\wäöüßÄÖÜ]+\s+[A-Z][\wäöüßÄÖÜ]+)/m, // Multi-word names with umlauts
      ];

      let sender = 'Unknown';
      for (const pattern of senderPatterns) {
        const match = text.match(pattern);
        if (match) {
          let extracted = match[1]?.trim() || 'Unknown';
          // Clean up the extracted sender
          extracted = extracted.split('\n')[0].substring(0, 100).trim();
          if (extracted.length > 2) {
            sender = extracted;
            break;
          }
        }
      }
      timings.senderExtraction = Date.now() - senderStartTime;

      // Use compromise for NLP analysis
      const nlpStartTime = Date.now();
      const doc = nlp(text);
      timings.nlpInitialization = Date.now() - nlpStartTime;

      // Extract entities (compromise handles basic entity extraction)
      const entityStartTime = Date.now();
      const people = doc
        .people()
        .out('array')
        .filter((p: string) => p.length > 2);
      const organizations = doc
        .organizations()
        .out('array')
        .filter((o: string) => o.length > 2);
      const legalSuffixCompanies = this.extractCompaniesBeforeLegalSuffix(text);
      const mergedOrganizations = Array.from(
        new Set([...organizations, ...legalSuffixCompanies]),
      );
      const places = doc
        .places()
        .out('array')
        .filter((p: string) => p.length > 2);
      timings.entityExtraction = Date.now() - entityStartTime;

      if (sender === 'Unknown' && legalSuffixCompanies.length > 0) {
        sender = legalSuffixCompanies[0];
      }

      // Get word frequency - extract meaningful terms
      const wordStartTime = Date.now();
      const allWords = text
        .toLowerCase()
        .split(/[\s\n.,;:!?()[\]{}"'\-]+/)
        .filter(
          (word) =>
            word.length > 3 &&
            !['that', 'this', 'with', 'from', 'have', 'been'].includes(word),
        );

      // Extract dates from text
      const datesStartTime = Date.now();
      const dates = this.extractDates(text);
      timings.dateExtraction = Date.now() - datesStartTime;

      // Extract websites, emails, and domains
      const webStartTime = Date.now();
      const webData = this.extractWebsitesAndEmails(text);
      timings.webEmailExtraction = Date.now() - webStartTime;

      // Extract number sequences (account numbers, insurance IDs, etc.)
      const numberSeqStartTime = Date.now();
      const numberSequences = this.extractNumberSequences(text);
      timings.numberSequenceExtraction = Date.now() - numberSeqStartTime;

      // Extract full names based on user's last name (no longer used)
      const fullNameStartTime = Date.now();
      const fullNames: string[] = [];
      timings.fullNameExtraction = Date.now() - fullNameStartTime;

      // Count word frequency
      const wordFreqMap = new Map<string, number>();
      allWords.forEach((word) => {
        wordFreqMap.set(word, (wordFreqMap.get(word) || 0) + 1);
      });

      // Get top 10 most frequent words
      const wordFreq = Array.from(wordFreqMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);
      timings.wordFrequencyAnalysis = Date.now() - wordStartTime;

      // Calculate text statistics
      const statsStartTime = Date.now();
      const sentences = doc.sentences().length;
      const characterCount = text.length;
      const lineCount = text.split('\n').length;

      // Extract subject line (usually first meaningful line with minimum length)
      const lines = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 5);
      const subject = lines.length > 0 ? lines[0].substring(0, 100) : 'N/A';
      timings.statisticsCalculation = Date.now() - statsStartTime;

      // Calculate total analysis time
      timings.totalAnalysisTime = Date.now() - analysisStartTime;

      // Log performance timings
      console.log('\n[Performance] Analysis timing breakdown:');
      console.log(`  Sender extraction: ${timings.senderExtraction}ms`);
      console.log(`  NLP initialization: ${timings.nlpInitialization}ms`);
      console.log(`  Entity extraction: ${timings.entityExtraction}ms`);
      console.log(`  Word frequency: ${timings.wordFrequencyAnalysis}ms`);
      console.log(`  Date extraction: ${timings.dateExtraction}ms`);
      console.log(`  Web/Email extraction: ${timings.webEmailExtraction}ms`);
      console.log(
        `  Number sequence extraction: ${timings.numberSequenceExtraction}ms`,
      );
      console.log(`  Full name extraction: ${timings.fullNameExtraction}ms`);
      console.log(
        `  Statistics calculation: ${timings.statisticsCalculation}ms`,
      );
      console.log(`  TOTAL: ${timings.totalAnalysisTime}ms`);

      return {
        sender: sender,
        people: people.length > 0 ? people : [],
        organizations:
          mergedOrganizations.length > 0 ? mergedOrganizations : [],
        places: places.length > 0 ? places : [],
        dates: dates.length > 0 ? dates : [],
        websites: webData.websites.length > 0 ? webData.websites : [],
        emails: webData.emails.length > 0 ? webData.emails : [],
        domains: webData.domains.length > 0 ? webData.domains : [],
        numberSequences: numberSequences.length > 0 ? numberSequences : [],
        fullNames: fullNames.length > 0 ? fullNames : [],
        keywords: wordFreq,
        statistics: {
          totalCharacters: characterCount,
          totalLines: lineCount,
          totalSentences: sentences,
          averageLineLength:
            characterCount > 0 ? Math.round(characterCount / lineCount) : 0,
        },
        subject: subject,
      };
    } catch (error: any) {
      console.error(
        '[OCR Analysis] Error during text analysis:',
        error.message,
      );
      return {
        sender: 'Unknown',
        error: error.message,
      };
    }
  }

  private extractCompaniesBeforeLegalSuffix(text: string): string[] {
    const candidates: string[] = [];
    const seen = new Set<string>();
    const normalized = text.replace(/\s+/g, ' ').trim();
    const companyPattern =
      /\b([A-Za-zÄÖÜäöüß0-9][A-Za-zÄÖÜäöüß0-9&.,'’+\-/\s]{1,100}?)\s+(GmbH|AG)\b/g;

    const pushCandidate = (prefix: string, suffix: string) => {
      const cleanedPrefix = prefix
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^[^A-Za-zÄÖÜäöüß]+/, '')
        .replace(/[^A-Za-zÄÖÜäöüß0-9&.+\-\s]+$/g, '');

      if (!cleanedPrefix || cleanedPrefix.length < 2) return;

      const company = `${cleanedPrefix} ${suffix}`.replace(/\s+/g, ' ').trim();
      const key = company.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push(company);
      }
    };

    let match: RegExpExecArray | null;
    while ((match = companyPattern.exec(normalized)) !== null) {
      const rawPrefix = (match[1] || '').trim();
      const suffix = match[2];

      const segmentedPrefix = rawPrefix
        .split(/[,:;()\[\]{}|]/)
        .pop()
        ?.trim();
      if (!segmentedPrefix) continue;

      const words = segmentedPrefix.split(/\s+/).filter(Boolean);
      const scopedPrefix = words.slice(-6).join(' ').trim();
      if (scopedPrefix.length < 2) continue;

      // Highest priority: focused segment from the last token containing '&' (e.g. "F&B Schlagheck")
      let ampersandIndex = -1;
      for (let i = words.length - 1; i >= 0; i--) {
        if ((words[i] as string).includes('&')) {
          ampersandIndex = i;
          break;
        }
      }
      if (ampersandIndex >= 0 && ampersandIndex < words.length) {
        pushCandidate(words.slice(ampersandIndex).join(' '), suffix);
      }

      // Fallback priority: last 2 words immediately before legal suffix
      if (words.length >= 2) {
        pushCandidate(words.slice(-2).join(' '), suffix);
      }

      // Broader fallback: scoped prefix (up to 6 trailing words)
      pushCandidate(scopedPrefix, suffix);
    }

    return candidates;
  }

  /**
   * Cleanup the OCR worker
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      console.log('Terminating OCR worker...');
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

// Lazy singleton export
let instance: OcrService | null = null;

export function getOcrService(): OcrService {
  if (!instance) {
    instance = OcrService.getInstance();
  }
  return instance;
}
