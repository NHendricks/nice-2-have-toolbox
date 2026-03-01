/**
 * PDF Split Command
 * Extracts selected pages from a PDF into a new PDF file.
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

function parsePagesString(input: string, max: number): number[] {
  if (!input) return [];
  const out: number[] = [];
  for (const part of input.split(/[,;\s]+/)) {
    if (/^\d+$/.test(part)) {
      const n = parseInt(part, 10);
      if (n >= 1 && n <= max) out.push(n);
    } else if (/^(\d+)-(\d+)$/.test(part)) {
      const [, a, b] = part.match(/(\d+)-(\d+)/) || [];
      let from = parseInt(a!, 10),
        to = parseInt(b!, 10);
      if (from > to) [from, to] = [to, from];
      for (let i = from; i <= to; ++i) if (i >= 1 && i <= max) out.push(i);
    }
  }
  return Array.from(new Set(out)).sort((a, b) => a - b);
}

export class PdfSplitCommand implements ICommand {
  /**
   * Returns SVG DataURLs for all pages of a PDF for preview purposes.
   * params: { inputPath: string }
   */
  async getPreviews(params: any): Promise<{
    success: boolean;
    totalPages?: number;
    previews?: string[];
    error?: string;
  }> {
    const inputPath: string = params?.inputPath;
    if (!inputPath || typeof inputPath !== 'string') {
      return { success: false, error: 'inputPath is required' };
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
      const previews: string[] = [];
      for (let i = 0; i < totalPages; i++) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="170">
          <rect width="120" height="170" fill="#fff" stroke="#bbb"/>
          <text x="60" y="85" text-anchor="middle" dominant-baseline="central" font-size="32" font-weight="bold" fill="#222">${i + 1}</text>
        </svg>`;
        previews.push(
          `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
        );
      }
      return { success: true, totalPages, previews };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Unknown error' };
    }
  }

  getDescription(): string {
    return 'PDF Split: extracts selected pages from a PDF into a new PDF file';
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
        description: 'Directory to save the output PDF',
        required: true,
      },
      {
        name: 'pages',
        type: 'string',
        description:
          'Pages to extract, e.g. "1,3,5-8". Omit to extract all pages.',
        required: false,
      },
    ];
  }

  async execute(params: any): Promise<SplitResult | any> {
    // Route preview action
    if (params?.action === 'getPreviews') {
      return this.getPreviews(params);
    }

    const inputPath: string = params?.inputPath;
    const outputDir: string = params?.outputDir;
    const pagesStr: string = params?.pages || '';

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

      // Parse page selection; fall back to all pages
      let selectedPages = parsePagesString(pagesStr, totalPages);
      if (selectedPages.length === 0) {
        selectedPages = Array.from({ length: totalPages }, (_, i) => i + 1);
      }

      await mkdir(outputDir, { recursive: true });

      // Build one output PDF with all selected pages
      const outDoc = await PDFDocument.create();
      const indices = selectedPages.map((p) => p - 1); // 0-based
      const copiedPages = await outDoc.copyPages(srcDoc, indices);
      copiedPages.forEach((p) => outDoc.addPage(p));

      const baseName = path.basename(inputPath, path.extname(inputPath));
      const safePages =
        pagesStr.replace(/[^0-9,\-]/g, '').substring(0, 40) || 'alle';
      const outputFileName = `${baseName}_seiten_${safePages}.pdf`;
      const outputPath = path.join(outputDir, outputFileName);

      const outputBytes = await outDoc.save();
      await writeFile(outputPath, outputBytes);

      return {
        success: true,
        totalPages,
        selectedCount: selectedPages.length,
        outputFiles: [outputPath],
        outputDir,
      };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Unknown error' };
    }
  }
}
