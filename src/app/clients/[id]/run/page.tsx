"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { NavHeader } from "@/components/nav-header";
import { WeekPicker } from "@/components/week-picker";
import { PreviewTable } from "@/components/preview-table";
import { RiskPanel } from "@/components/risk-panel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type {
  CampaignInterpretation,
  NominationRow,
  ProductNomination,
  RiskFlag,
} from "@/lib/types";

interface RunResult {
  runId: string;
  mode: string;
  campaigns: CampaignInterpretation[];
  nominations: ProductNomination[];
  risks: RiskFlag[];
  finalRows: NominationRow[];
  overallStatus: string;
  stats: {
    campaignCount: number;
    productCount: number;
    joinRate: number;
    uniqueSkus: number;
  };
}

interface ClientData {
  id: string;
  name: string;
}

const PIPELINE_STEPS = [
  { key: "loading_data", label: "Loading data" },
  { key: "interpreting_campaigns", label: "Interpreting campaigns" },
  { key: "synthesizing_signals", label: "Analyzing sales data" },
  { key: "selecting_products", label: "Selecting products" },
  { key: "auditing_risks", label: "Auditing risks" },
  { key: "writing_nominations", label: "Formatting nominations" },
];

export default function RunPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<ClientData | null>(null);
  const [weekStart, setWeekStart] = useState("");
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);

  useEffect(() => {
    fetch(`/api/clients/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => setClient({ id: data.id, name: data.name }))
      .catch(() => router.push("/"));
  }, [params.id, router]);

  const runPipeline = useCallback(
    async (mode: "dry_run" | "generate_write") => {
      if (!weekStart) {
        toast.error("Please select a week");
        return;
      }

      if (
        mode === "generate_write" &&
        !confirm(
          "This will write nominations to the Google Sheet. Continue?"
        )
      ) {
        return;
      }

      setRunning(true);
      setResult(null);
      setCurrentStep("loading_data");

      try {
        const res = await fetch("/api/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: params.id,
            weekStart,
            mode,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.details || err.error || "Pipeline failed");
        }

        const data: RunResult = await res.json();
        setResult(data);
        setCurrentStep("done");
        toast.success(
          mode === "dry_run"
            ? "Dry run complete"
            : "Nominations written to Sheet"
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Pipeline failed"
        );
        setCurrentStep("");
      } finally {
        setRunning(false);
      }
    },
    [weekStart, params.id]
  );

  if (!client) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{client.name}</h1>
            <p className="mt-1 text-muted-foreground">
              Generate weekly campaign nominations
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/clients/${client.id}/history`}>
              <Button variant="outline" size="sm">
                History
              </Button>
            </Link>
            <Link href={`/clients/${client.id}/settings`}>
              <Button variant="outline" size="sm">
                Settings
              </Button>
            </Link>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Run Configuration</CardTitle>
            <CardDescription>
              Select the target week and run mode
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Week Start (Monday)
                </label>
                <WeekPicker value={weekStart} onChange={setWeekStart} />
              </div>
              <Button
                onClick={() => runPipeline("dry_run")}
                disabled={running || !weekStart}
                variant="outline"
              >
                {running && currentStep ? "Running..." : "Dry Run"}
              </Button>
              <Button
                onClick={() => runPipeline("generate_write")}
                disabled={running || !weekStart}
              >
                {running && currentStep
                  ? "Running..."
                  : "Generate & Write"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {running && currentStep && currentStep !== "done" && (
          <Card className="mb-6">
            <CardContent className="py-6">
              <div className="space-y-3">
                {PIPELINE_STEPS.map((step) => {
                  const stepIndex = PIPELINE_STEPS.findIndex(
                    (s) => s.key === step.key
                  );
                  const currentIndex = PIPELINE_STEPS.findIndex(
                    (s) => s.key === currentStep
                  );
                  const isActive = step.key === currentStep;
                  const isDone = stepIndex < currentIndex;

                  return (
                    <div
                      key={step.key}
                      className="flex items-center gap-3"
                    >
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                          isDone
                            ? "bg-primary text-primary-foreground"
                            : isActive
                              ? "animate-pulse bg-primary/50 text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isDone ? "✓" : stepIndex + 1}
                      </div>
                      <span
                        className={
                          isActive
                            ? "font-medium"
                            : isDone
                              ? "text-muted-foreground"
                              : "text-muted-foreground/50"
                        }
                      >
                        {step.label}
                      </span>
                      {isActive && (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    Results
                    {result.mode === "dry_run" && (
                      <Badge variant="secondary" className="ml-2">
                        Dry Run
                      </Badge>
                    )}
                  </CardTitle>
                  <Badge
                    variant={
                      result.overallStatus === "OK"
                        ? "default"
                        : result.overallStatus === "WARNING"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {result.overallStatus}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <div className="text-2xl font-bold">
                      {result.stats.campaignCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Campaigns
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <div className="text-2xl font-bold">
                      {result.stats.productCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Products
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <div className="text-2xl font-bold">
                      {result.stats.uniqueSkus}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Unique SKUs
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <div className="text-2xl font-bold">
                      {Math.round(result.stats.joinRate * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Join Rate
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="nominations" className="space-y-4">
              <TabsList>
                <TabsTrigger value="nominations">Nominations</TabsTrigger>
                <TabsTrigger value="risks">
                  Risks ({result.risks.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="nominations">
                <Card>
                  <CardContent className="pt-6">
                    <PreviewTable
                      campaigns={result.campaigns}
                      rows={result.finalRows}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="risks">
                <Card>
                  <CardContent className="pt-6">
                    <RiskPanel
                      risks={result.risks}
                      overallStatus={result.overallStatus}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
