import { XMLParser } from "fast-xml-parser";
import type { FeedProduct } from "./types";

export interface FeedTagMapping {
  root: string;
  item: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  price: string;
  availability: string;
  url: string;
  stock?: string;
}

export const DEFAULT_FEED_MAPPING: FeedTagMapping = {
  root: "SHOP",
  item: "SHOPITEM",
  sku: "ITEM_ID",
  name: "PRODUCTNAME",
  category: "CATEGORYTEXT",
  brand: "MANUFACTURER",
  price: "PRICE_VAT",
  availability: "DELIVERY_DATE",
  url: "URL",
  stock: "STOCK",
};

export async function parseFeed(
  feedUrl: string,
  mapping: FeedTagMapping = DEFAULT_FEED_MAPPING
): Promise<FeedProduct[]> {
  const response = await fetch(feedUrl, { next: { revalidate: 3600 } });
  if (!response.ok) {
    throw new Error(`Feed fetch failed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseAttributeValue: true,
  });

  const parsed = parser.parse(xml);

  let items = parsed?.[mapping.root]?.[mapping.item];
  if (!items) {
    const rootKeys = Object.keys(parsed || {});
    for (const rootKey of rootKeys) {
      const inner = parsed[rootKey];
      if (inner && typeof inner === "object") {
        for (const itemKey of Object.keys(inner)) {
          if (Array.isArray(inner[itemKey])) {
            items = inner[itemKey];
            break;
          }
        }
      }
      if (items) break;
    }
  }

  if (!Array.isArray(items)) {
    items = items ? [items] : [];
  }

  return items.map((item: Record<string, unknown>): FeedProduct => {
    const getValue = (path: string): string => {
      const parts = path.split(".");
      let val: unknown = item;
      for (const p of parts) {
        val = (val as Record<string, unknown>)?.[p];
      }
      return val != null ? String(val) : "";
    };

    return {
      sku: getValue(mapping.sku),
      name: getValue(mapping.name),
      category: getValue(mapping.category),
      brand: getValue(mapping.brand),
      price: parseFloat(getValue(mapping.price)) || 0,
      availability: getValue(mapping.availability),
      url: getValue(mapping.url),
      stock: mapping.stock ? parseInt(getValue(mapping.stock)) || undefined : undefined,
    };
  });
}
