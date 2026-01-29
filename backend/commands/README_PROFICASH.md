# ProfiCash/Bank Statement Parser

## Overview

The ProfiCash command is a flexible bank statement parser that supports multiple file formats:

- **CAMT.053 XML** - ISO 20022 standard format (Bank-to-Customer Statement)
- **Fixed-length format** - Legacy "feste Satzlänge 768" format

## Features

✅ **Automatic Format Detection** - Automatically detects the file format  
✅ **CAMT.053 Support** - Full ISO 20022 XML parsing  
✅ **Legacy Format Support** - Backwards compatible with fixed-length format  
✅ **Flexible Parsing** - Handles various CAMT.053 dialects  
✅ **Transaction Extraction** - Extracts counterparty, amounts, references, dates  
✅ **Summary Statistics** - Provides totals and year-based summaries

## Supported Formats

### 1. CAMT.053 XML (ISO 20022)

The CAMT.053 format is the international standard for electronic bank statements. It's an XML-based format that provides structured transaction data.

**Example Usage:**

```bash
node backend/dist/cli.js proficash '{"filePath":"./statements/account.xml"}'
```

**Auto-detection triggers:**

- File starts with `<?xml` or `<Document`
- Contains CAMT.053 namespace or `BkToCstmrStmt` element

**Extracted Data:**

- Account number (IBAN or other identifier)
- Transaction date (booking date)
- Amount with credit/debit indicator
- Transaction type/purpose code
- Counterparty bank (BIC/BLZ)
- Counterparty account (IBAN)
- Counterparty name
- Reference/remittance information (SVWZ)

### 2. Fixed-length Format (Legacy)

The legacy ProfiCash export format with fixed-width fields (768 characters per line).

**Example Usage:**

```bash
node backend/dist/cli.js proficash '{"filePath":"./statements/export.txt","format":"feste Satzlänge 768"}'
```

**Auto-detection triggers:**

- Lines are at least 700 characters long
- Not XML format

## Command Parameters

```typescript
{
  filePath: string;    // Required: Path to the bank statement file
  format?: string;     // Optional: "camt.053", "xml", or "feste Satzlänge 768"
                      // If not specified, format is auto-detected
}
```

## Response Format

```typescript
{
  success: boolean;
  operation: "parse-bank-statement";
  filePath: string;
  format: "camt.053" | "feste Satzlänge 768";
  headers: string[];   // Column headers
  rows: any[][];       // Transaction data rows
  summary: {
    totalRows: number;
    sum: number;       // Total sum of all transactions
    yearSums: {        // Sum per year
      [year: string]: number;
    };
  };
  timestamp: string;   // ISO timestamp
}
```

## Row Structure

Each row contains 9 columns:

1. **Konto** - Account number/IBAN
2. **Datum** - Date (DD.MM.YYYY format)
3. **Betrag** - Amount (negative for debits, positive for credits)
4. **Typ** - Transaction type
5. **BLZ** - Bank code (BIC/BLZ)
6. **Konto** - Counterparty account
7. **Empfänger** - Counterparty name
8. **VWZ** - Reference/purpose (Verwendungszweck)
9. **Kategorie** - Category (currently empty, reserved for future use)

## Usage Examples

### Via UI

1. Navigate to the ProfiCash tool in the UI
2. Select your bank statement file (XML or text)
3. The format will be auto-detected
4. View parsed transactions in a table

### Via CLI

**Parse CAMT.053 XML file:**

```bash
node backend/dist/cli.js proficash '{"filePath":"./bank_statement.xml"}'
```

**Parse with explicit format:**

```bash
node backend/dist/cli.js proficash '{"filePath":"./export.txt","format":"feste Satzlänge 768"}'
```

**Parse with auto-detection:**

```bash
node backend/dist/cli.js proficash '{"filePath":"./statement.xml"}'
```

## CAMT.053 XML Structure

The parser navigates the following XML structure:

```xml
<Document>
  <BkToCstmrStmt>
    <Stmt>
      <Acct>           <!-- Account information -->
      <Ntry>           <!-- Entry (transaction group) -->
        <Amt>          <!-- Amount -->
        <CdtDbtInd>    <!-- Credit/Debit indicator -->
        <BookgDt>      <!-- Booking date -->
        <NtryDtls>     <!-- Entry details -->
          <TxDtls>     <!-- Transaction details -->
            <RltdPties>  <!-- Related parties -->
              <Dbtr/Cdtr>  <!-- Debtor/Creditor -->
            </RltdPties>
            <RmtInf>   <!-- Remittance information -->
          </TxDtls>
        </NtryDtls>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>
```

## Error Handling

The parser includes comprehensive error handling:

- File not found errors
- Invalid XML format errors
- Missing required CAMT.053 elements
- Parsing errors for individual transactions (skipped with warning)

## Implementation Details

### Format Detection

1. Reads file content
2. Checks for XML markers (`<?xml`, `<Document`)
3. Checks for CAMT.053 specific elements
4. Falls back to fixed-length format detection
5. Returns detected format

### CAMT.053 Parsing

1. Parse XML using fast-xml-parser
2. Navigate to BkToCstmrStmt element
3. Extract statements
4. For each statement:
   - Extract account information
   - Process entries (Ntry)
   - Extract transaction details (TxDtls)
   - Map to standardized row format

### Fixed-length Parsing

1. Split content into lines
2. For each line ≥700 characters:
   - Extract fields using substring positions
   - Parse amount and sign
   - Clean up reference fields (SVWZ+)
   - Map to standardized row format

## Dependencies

- `fast-xml-parser` - For XML parsing
- `fs` - File system operations
- Node.js built-in modules

## Future Enhancements

- [ ] Support for .criteria files for automatic categorization
- [ ] Additional ISO 20022 formats (CAMT.052, CAMT.054)
- [ ] CSV export functionality
- [ ] Multi-currency support
- [ ] Transaction filtering and search
- [ ] Statistical analysis and reporting

## Troubleshooting

**Issue: Format not detected**

- Ensure file has correct structure
- Try specifying format explicitly

**Issue: Missing transactions**

- Check XML structure matches CAMT.053 standard
- Review console warnings for parsing errors

**Issue: Incorrect amounts**

- Verify CdtDbtInd (credit/debit) is present in XML
- Check decimal separator in fixed-length format

## Contributing

When adding support for new formats:

1. Add format detection in `detectFormat()`
2. Implement parser method (e.g., `parseNewFormat()`)
3. Update `execute()` method to route to new parser
4. Follow existing pattern for transaction extraction
5. Update documentation

## License

Part of nh-toolbox - MIT License
