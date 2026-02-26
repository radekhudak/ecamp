"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PreviewTable } from "@/components/preview-table";
import { RiskPanel } from "@/components/risk-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RunRecord {
  id: string;
  weekStart: string;
  mode: string;
  campaignCount: number | null;
  productCount: number | null;
  joinRate: number | null;
  status: string;
  result: {
    campaigns?: unknown[];
    nominations?: unknown[];
    risks?: unknown[];
    finalRows?: unknown[];
    stats?: Record<string, unknown>;
  } | null;
  createdAt: string;
}

export default function HistoryPage() {
  const params = useParams();
  const router = useRouter();
  const [clientName, setClientName] = useState("");
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/clients/${params.id}`).then((r) => r.json()),
      fetch(`/api/clients/${params.id}/runs`).then((r) => r.json()),
    ])
      .then(([client, runsData]) => {
        setClientName(client.name);
        setRuns(runsData);
      })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  if (loading) {
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
            <h1 className="text-3xl font-bold">Run History</h1>
            <p className="mt-1 text-muted-foreground">{clientName}</p>
          </div>
          <Link href={`/clients/${params.id}/run`}>
            <Button>Back to Run</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Past Runs ({runs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {runs.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No runs yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Week</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Campaigns</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Join Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>
                        {new Date(run.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {new Date(run.weekStart).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={run.mode === "dry_run" ? "secondary" : "default"}>
                          {run.mode === "dry_run" ? "Dry Run" : "Write"}
                        </Badge>
                      </TableCell>
                      <TableCell>{run.campaignCount ?? "-"}</TableCell>
                      <TableCell>{run.productCount ?? "-"}</TableCell>
                      <TableCell>
                        {run.joinRate != null
                          ? `${Math.round(run.joinRate * 100)}%`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            run.status === "OK"
                              ? "default"
                              : run.status === "WARNING"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {run.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {run.result && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>
                                  Run Detail —{" "}
                                  {new Date(run.weekStart).toLocaleDateString()}
                                </DialogTitle>
                              </DialogHeader>
                              <Tabs defaultValue="nominations">
                                <TabsList>
                                  <TabsTrigger value="nominations">
                                    Nominations
                                  </TabsTrigger>
                                  <TabsTrigger value="risks">
                                    Risks
                                  </TabsTrigger>
                                </TabsList>
                                <TabsContent value="nominations">
                                  <PreviewTable
                                    campaigns={
                                      (run.result.campaigns as never[]) ?? []
                                    }
                                    rows={
                                      (run.result.finalRows as never[]) ?? []
                                    }
                                  />
                                </TabsContent>
                                <TabsContent value="risks">
                                  <RiskPanel
                                    risks={
                                      (run.result.risks as never[]) ?? []
                                    }
                                    overallStatus={run.status}
                                  />
                                </TabsContent>
                              </Tabs>
                            </DialogContent>
                          </Dialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
