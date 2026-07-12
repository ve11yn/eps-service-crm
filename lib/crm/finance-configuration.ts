type SettingRow = { setting_key: string; value: unknown };

export type FinanceConfiguration = {
  invoicePrefix: string;
  defaultInvoiceNotes: string | null;
  paymentTermsDays: number;
  paymentInstructions: string | null;
  taxName: string;
  taxRate: number;
};

function objectValue(row: SettingRow | undefined, key: string): Record<string, unknown> {
  if (!row || !row.value || typeof row.value !== "object" || Array.isArray(row.value)) {
    throw new Error(`Required configuration “${key}” is missing or invalid.`);
  }
  return row.value as Record<string, unknown>;
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function resolveFinanceConfiguration(rows: SettingRow[]): FinanceConfiguration {
  const byKey = new Map(rows.map((row) => [row.setting_key, row]));
  const invoice = objectValue(byKey.get("invoice_defaults"), "invoice_defaults");
  const payment = objectValue(byKey.get("payment_terms"), "payment_terms");
  const tax = objectValue(byKey.get("tax_settings"), "tax_settings");
  const prefix = optionalText(invoice.prefix)?.toUpperCase();
  if (!prefix || !/^[A-Z0-9-]{1,12}$/.test(prefix)) throw new Error("Invoice prefix must contain 1–12 letters, numbers, or hyphens.");
  const paymentTermsDays = Number(payment.days);
  if (!Number.isInteger(paymentTermsDays) || paymentTermsDays < 0 || paymentTermsDays > 365) throw new Error("Payment terms must be a whole number from 0 to 365 days.");
  const configuredTaxRate = Number(tax.rate);
  if (!Number.isFinite(configuredTaxRate) || configuredTaxRate < 0 || configuredTaxRate > 100) throw new Error("Tax rate must be between 0 and 100 percent.");
  const taxName = optionalText(tax.name);
  if (!taxName) throw new Error("Tax name is required.");
  return {
    invoicePrefix: prefix,
    defaultInvoiceNotes: optionalText(invoice.default_notes),
    paymentTermsDays,
    paymentInstructions: optionalText(payment.instructions),
    taxName,
    taxRate: tax.enabled === true ? configuredTaxRate : 0,
  };
}

export function calculateInvoiceAmounts(subtotalInput: number, taxRateInput: number) {
  if (!Number.isFinite(subtotalInput) || subtotalInput < 0) throw new Error("Invoice subtotal is invalid.");
  if (!Number.isFinite(taxRateInput) || taxRateInput < 0 || taxRateInput > 100) throw new Error("Invoice tax rate is invalid.");
  const subtotal = Math.round(subtotalInput * 100) / 100;
  const taxAmount = Math.round(subtotal * taxRateInput) / 100;
  return { subtotal, taxAmount, total: Math.round((subtotal + taxAmount) * 100) / 100 };
}

export function buildInvoiceNumber(prefix: string, now: Date, uniquePart: string) {
  return `${prefix}-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${uniquePart.toUpperCase()}`;
}
