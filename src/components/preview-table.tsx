"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { NominationRow, CampaignInterpretation } from "@/lib/types";

interface PreviewTableProps {
  campaigns: CampaignInterpretation[];
  rows: NominationRow[];
}

export function PreviewTable({ campaigns, rows }: PreviewTableProps) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No nominations generated
      </p>
    );
  }

  const campaignMap = new Map(campaigns.map((c) => [c.theme, c]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {campaigns.map((c) => (
          <Badge key={c.id} variant="outline">
            {c.theme} (priority: {c.priority})
          </Badge>
        ))}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Theme</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => {
              const campaign = campaignMap.get(row.theme);
              return (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.theme}</TableCell>
                  <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                  <TableCell className="max-w-48 truncate">{row.productName}</TableCell>
                  <TableCell>{row.discountType}</TableCell>
                  <TableCell className="max-w-48 truncate text-sm">
                    {row.reason}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.status === "ČEKÁ NA SCHVÁLENÍ"
                          ? "secondary"
                          : "default"
                      }
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-32 truncate text-xs text-muted-foreground">
                    {row.notes || (campaign?.constraints?.join(", "))}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
