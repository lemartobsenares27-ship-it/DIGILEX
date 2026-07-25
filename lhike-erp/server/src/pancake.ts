// Client for Pancake POS's Open API (Module 4, "Download Sales from 3P
// Apps", SOP 4-3). Shop ID and API Key are stored per-Page (Module 3,
// Section 3.5.1), entered through the Pages & Store UI -- not a
// server-wide secret -- since different pages can be connected to
// different Pancake shops.
const PANCAKE_BASE_URL = "https://pos.pages.fm/api/v1";

export interface PancakeOrder {
  id: number | string;
  display_id?: number | string;
  status?: number;
  status_name?: string;
  bill_full_name?: string;
  bill_phone_number?: string;
  shipping_address?: { full_address?: string } | null;
  total_price?: number;
  shipping_fee?: number;
  items?: Array<{ quantity?: number }>;
  inserted_at?: string;
  updated_at?: string;
  partner?: { name?: string } | null;
  tracking_id?: string | null;
}

interface PancakeOrdersResponse {
  success: boolean;
  data: PancakeOrder[];
  page_number: number;
  page_size: number;
  total_entries: number;
  total_pages: number;
}

export class PancakeApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "PancakeApiError";
  }
}

// Module 4, SOP 4-3, Step 3: the human-facing status names on LHIKE ERP's
// Download Sales from 3P Apps screen. Pancake's own numeric status codes
// aren't fully published, so this maps by Pancake's returned status_name
// (case-insensitively) rather than the numeric code.
const STATUS_NAME_MAP: Record<string, string> = {
  new: "Printed",
  confirmed: "Confirmed",
  cancel: "Canceled",
  cancelled: "Canceled",
  canceled: "Canceled",
  delivered: "Delivered",
  partial_return: "Partial Return",
  return: "Partial Return",
  returned: "Partial Return",
  printed: "Printed",
};

export function mapPancakeStatus(statusName: string | undefined): string {
  if (!statusName) return "Confirmed";
  return STATUS_NAME_MAP[statusName.toLowerCase()] ?? statusName;
}

export interface FetchOrdersParams {
  shopId: string;
  apiKey: string;
  startDateTime?: number;
  endDateTime?: number;
  pageNumber?: number;
  pageSize?: number;
}

export async function fetchPancakeOrders(params: FetchOrdersParams): Promise<PancakeOrdersResponse> {
  const url = new URL(`${PANCAKE_BASE_URL}/shops/${encodeURIComponent(params.shopId)}/orders`);
  url.searchParams.set("api_key", params.apiKey);
  url.searchParams.set("page_number", String(params.pageNumber ?? 1));
  url.searchParams.set("page_size", String(params.pageSize ?? 100));
  if (params.startDateTime) url.searchParams.set("startDateTime", String(params.startDateTime));
  if (params.endDateTime) url.searchParams.set("endDateTime", String(params.endDateTime));

  let res: Response;
  try {
    res = await fetch(url, { method: "GET" });
  } catch (err) {
    throw new PancakeApiError(`Could not reach Pancake POS: ${(err as Error).message}`);
  }

  if (!res.ok) {
    throw new PancakeApiError(`Pancake POS returned ${res.status} ${res.statusText}`, res.status);
  }

  const body = (await res.json()) as PancakeOrdersResponse;
  if (!body.success) {
    throw new PancakeApiError("Pancake POS reported an unsuccessful response.");
  }
  return body;
}
