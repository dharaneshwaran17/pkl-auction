const FORMULA_PREFIX = /^[=+\-@]/;

export function csvCell(value: string | number | null | undefined): string {
  let text = value == null ? "" : String(value);
  if (FORMULA_PREFIX.test(text)) {
    text = `'${text}`;
  }
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function csvRow(values: Array<string | number | null | undefined>): string {
  return values.map(csvCell).join(",");
}

export function toCsv(headerNote: string, headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const lines = [csvRow([headerNote]), csvRow(headers), ...rows.map((row) => csvRow(row))];
  return `${lines.join("\r\n")}\r\n`;
}

export const RESULTS_CSV_NOTE =
  "Best Auction Squad ranking – not the official Pro Kabaddi champion";
