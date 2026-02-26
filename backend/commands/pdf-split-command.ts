/**
 * PDF Split Command
 * Splits a PDF into individual pages, each saved as a separate PDF file.
 */

import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { CommandParameter, ICommand } from './command-interface.js';

interface SplitResult {
  success: boolean;
  totalPages?: number;
  outputFiles?: string[];
  outputDir?: string;
  error?: string;
}

export class PdfSplitCommand implements ICommand {
  getDescription(): string {
    return 'PDF Split: splits a PDF into individual pages, each saved as a separate PDF file';
  }

  getParameters(): CommandParameter[] {
    return [
      {
        name: 'inputPath',
        type: 'string',
        description: 'Path to the input PDF file',
        required: true,
      },
      {
        name: 'outputDir',
        type: 'string',
        description: 'Directory to save the individual page PDFs',
        required: true,
      },
    ];
  }

  async execute(params: any): Promise<SplitResult> {
    const inputPath: string = params?.inputPath;
    const outputDir: string = params?.outputDir;

    if (!inputPath || typeof inputPath !== 'string') {
      return { success: false, error: 'inputPath is required' };
    }
    if (!outputDir || typeof outputDir !== 'string') {
      return { success: false, error: 'outputDir is required' };
    }

    if (!existsSync(inputPath)) {
      return { success: false, error: `File not found: ${inputPath}` };
    }

    try {
      const pdfBytes = await readFile(inputPath);
      const srcDoc = await PDFDocument.load(pdfBytes);
      const totalPages = srcDoc.getPageCount();

      if (totalPages === 0) {
        return { success: false, error: 'PDF has no pages' };
      }

      await mkdir(outputDir, { recursive: true });

      const baseName = path.basename(inputPath, path.extname(inputPath));
      const padLength = String(totalPages).length;
      const outputFiles: string[] = [];

      for (let i = 0; i < totalPages; i++) {
        const pageDoc = await PDFDocument.create();
        const [copiedPage] = await pageDoc.copyPages(srcDoc, [i]);
        pageDoc.addPage(copiedPage);

        const pageNumber = String(i + 1).padStart(padLength, '0');
        const outputFileName = `${baseName}_page_${pageNumber}.pdf`;
        const outputPath = path.join(outputDir, outputFileName);

        const outputBytes = await pageDoc.save();
        await writeFile(outputPath, outputBytes);
        outputFiles.push(outputPath);
      }

      return {
        success: true,
        totalPages,
        outputFiles,
        outputDir,
      };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Unknown error' };
    }
  }
}
