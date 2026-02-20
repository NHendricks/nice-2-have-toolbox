import { createWorker } from 'tesseract.js';
import * as fs from 'fs';
import * as path from 'path';

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

      console.log(`[OCR] Text extraction complete. Total length: ${allTexts.join('').length} chars`);
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

    return textFilePath;
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
