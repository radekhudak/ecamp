"use client";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { RiskFlag } from "@/lib/types";

interface RiskPanelProps {
  risks: RiskFlag[];
  overallStatus: string;
}

export function RiskPanel({ risks, overallStatus }: RiskPanelProps) {
  if (risks.length === 0) {
    return (
      <Alert>
        <div className="flex items-center gap-2">
          <Badge variant="default">OK</Badge>
          <span>No risks detected</span>
        </div>
      </Alert>
    );
  }

  const highRisks = risks.filter((r) => r.severity === "HIGH");
  const medRisks = risks.filter((r) => r.severity === "MEDIUM");
  const lowRisks = risks.filter((r) => r.severity === "LOW");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Badge
          variant={
            overallStatus === "OK"
              ? "default"
              : overallStatus === "WARNING"
                ? "secondary"
                : "destructive"
          }
        >
          {overallStatus}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {risks.length} risk{risks.length === 1 ? "" : "s"} found
          {highRisks.length > 0 && ` (${highRisks.length} high)`}
        </span>
      </div>

      {highRisks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-destructive">
            High Severity
          </h4>
          {highRisks.map((r, i) => (
            <Alert key={i} variant="destructive">
              <div className="flex items-start gap-2">
                <Badge variant="destructive" className="shrink-0">
                  {r.type}
                </Badge>
                <div>
                  <span className="font-mono text-xs">{r.sku}</span>
                  <p className="text-sm">{r.message}</p>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {medRisks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-amber-600">
            Medium Severity
          </h4>
          {medRisks.map((r, i) => (
            <Alert key={i}>
              <div className="flex items-start gap-2">
                <Badge variant="secondary" className="shrink-0">
                  {r.type}
                </Badge>
                <div>
                  <span className="font-mono text-xs">{r.sku}</span>
                  <p className="text-sm">{r.message}</p>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {lowRisks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">
            Low Severity
          </h4>
          {lowRisks.map((r, i) => (
            <Alert key={i}>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0">
                  {r.type}
                </Badge>
                <div>
                  <span className="font-mono text-xs">{r.sku}</span>
                  <p className="text-sm">{r.message}</p>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}
    </div>
  );
}
