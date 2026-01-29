/**
 * ProfiCash/Bank Statement Parser
 * Supports multiple formats:
 * - CAMT.053 XML (ISO 20022 standard)
 * - Fixed-length format (legacy "feste Satzlänge 768")
 */

import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';
import { promisify } from 'util';
import { CommandParameter, ICommand } from './command-interface.js';

const readFile = promisify(fs.readFile);

interface Transaction {
  account: string;
  date: string;
  amount: number;
  type: string;
  counterpartyBank?: string;
  counterpartyAccount?: string;
  counterpartyName?: string;
  reference?: string;
  category?: string;
}

export class ProficashCommand implements ICommand {
  async execute(params: any): Promise<any> {
    const { filePath, format } = params;

    try {
      // Auto-detect format if not specified
      const detectedFormat = format || (await this.detectFormat(filePath));

      if (detectedFormat === 'camt.053' || detectedFormat === 'xml') {
        return await this.parseCamt053(filePath);
      } else if (detectedFormat === 'feste Satzlänge 768') {
        return await this.parseFixedLength768(filePath);
      } else {
        return {
          success: false,
          error: `Unsupported or unrecognized format: ${detectedFormat}`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }

  /**
   * Detect file format by analyzing content
   */
  private async detectFormat(filePath: string): Promise<string> {
    const content = await readFile(filePath, 'utf-8');
    const trimmed = content.trim();

    // Check if it's XML
    if (trimmed.startsWith('<?xml') || trimmed.startsWith('<Document')) {
      // Check for CAMT.053 namespace
      if (
        content.includes('camt.053') ||
        content.includes('BkToCstmrStmt') ||
        content.includes('urn:iso:std:iso:20022:tech:xsd:camt.053')
      ) {
        return 'camt.053';
      }
      return 'xml';
    }

    // Check if it looks like fixed-length format
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length > 0 && lines[0].length >= 700) {
      return 'feste Satzlänge 768';
    }

    return 'unknown';
  }

  /**
   * Parse CAMT.053 XML file (ISO 20022 Bank-to-Customer Statement)
   */
  private async parseCamt053(filePath: string): Promise<any> {
    if (!filePath) {
      throw new Error('filePath is required');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const content = await readFile(filePath, 'utf-8');

    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
    });

    const xmlDoc = parser.parse(content);

    // Navigate CAMT.053 structure
    const document = xmlDoc.Document || xmlDoc;
    const bkToCstmrStmt = document.BkToCstmrStmt || document['camt.053.001.02'];

    if (!bkToCstmrStmt) {
      throw new Error(
        'Invalid CAMT.053 format: BkToCstmrStmt element not found',
      );
    }

    const statements = Array.isArray(bkToCstmrStmt.Stmt)
      ? bkToCstmrStmt.Stmt
      : [bkToCstmrStmt.Stmt];

    const transactions: Transaction[] = [];
    let totalSum = 0;
    const yearSums: Record<string, number> = {};

    for (const stmt of statements) {
      // Extract account information
      const account = this.extractAccountNumber(stmt.Acct);

      // Get entries
      const entries = stmt.Ntry
        ? Array.isArray(stmt.Ntry)
          ? stmt.Ntry
          : [stmt.Ntry]
        : [];

      for (const entry of entries) {
        // Extract transaction details from entry
        const entryTransactions = this.parseEntry(entry, account);
        transactions.push(...entryTransactions);

        // Update sums
        for (const txn of entryTransactions) {
          totalSum += txn.amount;
          const year =
            txn.date.split('.')[2] || new Date().getFullYear().toString();
          if (!yearSums[year]) {
            yearSums[year] = 0;
          }
          yearSums[year] += txn.amount;
        }
      }
    }

    // Convert transactions to rows
    const rows = transactions.map((txn) => [
      txn.account,
      txn.date,
      txn.amount,
      txn.type,
      txn.counterpartyBank || '',
      txn.counterpartyAccount || '',
      txn.counterpartyName || '',
      txn.reference || '',
      txn.category || '',
    ]);

    return {
      success: true,
      operation: 'parse-bank-statement',
      filePath: filePath,
      format: 'camt.053',
      headers: [
        'Konto',
        'Datum',
        'Betrag',
        'Typ',
        'BLZ',
        'Konto',
        'Empfänger',
        'VWZ',
        'Kategorie',
      ],
      rows: rows,
      summary: {
        totalRows: rows.length,
        sum: totalSum,
        yearSums: yearSums,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Extract account number from CAMT.053 account structure
   */
  private extractAccountNumber(acct: any): string {
    if (!acct) return '';

    // Try IBAN
    if (acct.Id?.IBAN) {
      return acct.Id.IBAN;
    }

    // Try Other ID
    if (acct.Id?.Othr?.Id) {
      return acct.Id.Othr.Id;
    }

    return '';
  }

  /**
   * Parse a single entry from CAMT.053
   */
  private parseEntry(entry: any, account: string): Transaction[] {
    const transactions: Transaction[] = [];

    // Entry amount and credit/debit indicator
    const amount = parseFloat(entry.Amt?.['#text'] || entry.Amt || '0');
    const cdtDbtInd = entry.CdtDbtInd; // CRDT (credit) or DBIT (debit)
    const finalAmount =
      cdtDbtInd === 'DBIT' ? -Math.abs(amount) : Math.abs(amount);

    // Entry date
    const bookingDate = entry.BookgDt?.Dt || entry.ValDt?.Dt || '';
    const formattedDate = this.formatDate(bookingDate);

    // Get transaction details
    const ntryDtls = entry.NtryDtls
      ? Array.isArray(entry.NtryDtls)
        ? entry.NtryDtls
        : [entry.NtryDtls]
      : [];

    if (ntryDtls.length === 0) {
      // No detailed transactions, create one from entry
      transactions.push({
        account: account,
        date: formattedDate,
        amount: finalAmount,
        type: this.extractTransactionType(entry),
        counterpartyBank: '',
        counterpartyAccount: '',
        counterpartyName: '',
        reference: this.extractReference(entry),
        category: '',
      });
    } else {
      // Process detailed transactions
      for (const dtl of ntryDtls) {
        const txnDtls = dtl.TxDtls
          ? Array.isArray(dtl.TxDtls)
            ? dtl.TxDtls
            : [dtl.TxDtls]
          : [];

        for (const txn of txnDtls) {
          transactions.push({
            account: account,
            date: formattedDate,
            amount: finalAmount,
            type: this.extractTransactionType(txn),
            counterpartyBank: this.extractCounterpartyBank(txn),
            counterpartyAccount: this.extractCounterpartyAccount(txn),
            counterpartyName: this.extractCounterpartyName(txn),
            reference: this.extractReference(txn),
            category: '',
          });
        }
      }
    }

    return transactions;
  }

  /**
   * Extract transaction type/purpose code
   */
  private extractTransactionType(data: any): string {
    // Try BkTxCd (Bank Transaction Code)
    if (data.BkTxCd?.Prtry?.Cd) {
      return data.BkTxCd.Prtry.Cd;
    }
    if (data.BkTxCd?.Domn?.Cd) {
      return data.BkTxCd.Domn.Cd;
    }

    // Try AddtlTxInf
    if (data.AddtlTxInf) {
      return data.AddtlTxInf;
    }

    return '';
  }

  /**
   * Extract counterparty bank code (BIC/BLZ)
   */
  private extractCounterpartyBank(txn: any): string {
    const rltdPties = txn.RltdPties;
    if (!rltdPties) return '';

    // Try debtor bank
    if (rltdPties.DbtrAcct?.Id?.Othr?.Id) {
      return rltdPties.DbtrAcct.Id.Othr.Id;
    }

    // Try creditor bank
    if (rltdPties.CdtrAcct?.Id?.Othr?.Id) {
      return rltdPties.CdtrAcct.Id.Othr.Id;
    }

    return '';
  }

  /**
   * Extract counterparty account (IBAN or account number)
   */
  private extractCounterpartyAccount(txn: any): string {
    const rltdPties = txn.RltdPties;
    if (!rltdPties) return '';

    // Try debtor account
    if (rltdPties.DbtrAcct?.Id?.IBAN) {
      return rltdPties.DbtrAcct.Id.IBAN;
    }
    if (rltdPties.DbtrAcct?.Id?.Othr?.Id) {
      return rltdPties.DbtrAcct.Id.Othr.Id;
    }

    // Try creditor account
    if (rltdPties.CdtrAcct?.Id?.IBAN) {
      return rltdPties.CdtrAcct.Id.IBAN;
    }
    if (rltdPties.CdtrAcct?.Id?.Othr?.Id) {
      return rltdPties.CdtrAcct.Id.Othr.Id;
    }

    return '';
  }

  /**
   * Extract counterparty name
   */
  private extractCounterpartyName(txn: any): string {
    const rltdPties = txn.RltdPties;
    if (!rltdPties) return '';

    // Try debtor
    if (rltdPties.Dbtr?.Nm) {
      return rltdPties.Dbtr.Nm;
    }

    // Try creditor
    if (rltdPties.Cdtr?.Nm) {
      return rltdPties.Cdtr.Nm;
    }

    return '';
  }

  /**
   * Extract reference/remittance information
   */
  private extractReference(data: any): string {
    const references: string[] = [];

    // Try RmtInf (Remittance Information)
    if (data.RmtInf) {
      if (data.RmtInf.Ustrd) {
        const ustrd = Array.isArray(data.RmtInf.Ustrd)
          ? data.RmtInf.Ustrd
          : [data.RmtInf.Ustrd];
        references.push(...ustrd.filter((u: any) => u));
      }
      if (data.RmtInf.Strd?.CdtrRefInf?.Ref) {
        references.push(data.RmtInf.Strd.CdtrRefInf.Ref);
      }
    }

    // Try AddtlNtryInf
    if (data.AddtlNtryInf) {
      references.push(data.AddtlNtryInf);
    }

    return references.join(' ').trim();
  }

  /**
   * Format date from YYYY-MM-DD to DD.MM.YYYY
   */
  private formatDate(isoDate: string): string {
    if (!isoDate) return '';

    const match = isoDate.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[3]}.${match[2]}.${match[1]}`;
    }

    return isoDate;
  }

  /**
   * Parse ProfiCash file in "feste Satzlänge 768" format (legacy)
   */
  private async parseFixedLength768(filePath: string): Promise<any> {
    if (!filePath) {
      throw new Error('filePath is required');
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    // Read file content
    const content = await readFile(filePath, 'utf-8');
    const lines = content
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0);

    const rows: any[][] = [];
    let totalSum = 0;
    const yearSums: Record<string, number> = {};

    for (const line of lines) {
      // Skip lines that are too short
      if (line.length < 700) {
        console.warn(
          `Skipping line with length ${line.length}, expected at least 700`,
        );
        continue;
      }

      try {
        // Parse fixed-width fields according to ProfiCash format
        let account = line.substring(0, 10).trim();
        let dateStr = line.substring(10, 20).trim();
        let amountStr = line.substring(45, 57).trim();
        let plusOrMinus = line.substring(57, 58).trim();

        // Special case for old Sparkassen transactions
        if (plusOrMinus === 'R') {
          plusOrMinus = line.substring(58, 59).trim();
        }

        let type = line.substring(82, 109).trim();
        let toBank = line.substring(119, 127).trim();
        let toAccount = line.substring(131, 154).trim();
        let toName = line.substring(212, 266).trim();
        let reason = line.substring(266, 321).trim();
        let reason2 = line.substring(347, Math.min(line.length, 700)).trim();

        // Clean up reason fields - extract SVWZ+ content
        const svwzIndex = reason.indexOf('SVWZ+');
        if (svwzIndex !== -1) {
          reason = reason.substring(svwzIndex + 5).trim();
        }

        const svwzIndex2 = reason2.indexOf('SVWZ+');
        if (svwzIndex2 !== -1) {
          reason2 = reason2.substring(svwzIndex2 + 5).trim();
        }

        // Combine reason fields if reason2 has content
        let fullReason = reason;
        if (reason2) {
          fullReason = reason + ' ' + reason2;
        }

        // Parse amount
        amountStr = amountStr.replace(',', '.');
        let amount = parseFloat(amountStr);

        // Apply plus/minus sign
        if (plusOrMinus === '-' || plusOrMinus === 'S') {
          amount = -Math.abs(amount);
        } else {
          amount = Math.abs(amount);
        }

        // Format date from DD.MM.YYYY to display format
        const formattedDate = dateStr;

        // Extract year for summary
        const year = dateStr.split('.')[2];

        // Update sums
        totalSum += amount;
        if (!yearSums[year]) {
          yearSums[year] = 0;
        }
        yearSums[year] += amount;

        // Add row (9 columns to match the headers)
        rows.push([
          account,
          formattedDate,
          amount,
          type,
          toBank,
          toAccount,
          toName,
          fullReason,
          '', // Kategorie (category) - would need .criteria file to populate
        ]);
      } catch (error: any) {
        console.warn(`Error parsing line: ${error.message}`);
        continue;
      }
    }

    return {
      success: true,
      operation: 'parse-bank-statement',
      filePath: filePath,
      format: 'feste Satzlänge 768',
      headers: [
        'Konto',
        'Datum',
        'Betrag',
        'Typ',
        'BLZ',
        'Konto',
        'Empfänger',
        'VWZ',
        'Kategorie',
      ],
      rows: rows,
      summary: {
        totalRows: rows.length,
        sum: totalSum,
        yearSums: yearSums,
      },
      timestamp: new Date().toISOString(),
    };
  }

  getDescription(): string {
    return 'Parse bank statement files (CAMT.053 XML or fixed-length format)';
  }

  getParameters(): CommandParameter[] {
    return [
      {
        name: 'filePath',
        type: 'string',
        description: 'Path to the bank statement file',
        required: true,
      },
      {
        name: 'format',
        type: 'string',
        description:
          'File format: "camt.053", "xml", or "feste Satzlänge 768" (auto-detected if not specified)',
        required: false,
      },
    ];
  }
}
