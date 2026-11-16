// Mirrors the response shapes in apps/api/src/invoices/invoice.types.ts.
export const STATUSES = ["processing", "needs_review", "approved", "rejected"] as const;
export type InvoiceStatus = (typeof STATUSES)[number];

export interface InvoiceSummary {
  id: number;
  vendor: string;
  invoiceNumber: string;
  status: InvoiceStatus;
}

export interface Invoice extends InvoiceSummary {
  amountCents: number;
  currency: string;
  invoiceDate: string;
  duplicateOfId: number | null;
  createdAt: string;
  updatedAt: string;
  allowedTransitions: InvoiceStatus[];
  approvalBlockedReason: string | null;
}

export interface InvoiceDetail extends Invoice {
  duplicateGroup: InvoiceSummary[];
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(0, `Cannot reach the API at ${API_URL}. Is it running?`);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = Array.isArray(body?.message) ? body.message.join("; ") : body?.message;
    throw new ApiError(res.status, message ?? `Request failed with ${res.status}`);
  }
  return body as T;
}

export function listInvoices(statuses?: readonly InvoiceStatus[]): Promise<Invoice[]> {
  const query = statuses?.length ? `?status=${statuses.join(",")}` : "";
  return request<Invoice[]>(`/invoices${query}`);
}

export function getInvoice(id: string | number): Promise<InvoiceDetail> {
  return request<InvoiceDetail>(`/invoices/${id}`);
}

export function updateInvoiceStatus(id: number, status: InvoiceStatus): Promise<InvoiceDetail> {
  return request<InvoiceDetail>(`/invoices/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
