"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ClientWithRun {
  id: string;
  name: string;
  processSheetId: string;
  updatedAt: string;
  runs: {
    id: string;
    status: string;
    weekStart: string;
    createdAt: string;
  }[];
}

export default function DashboardPage() {
  const [clients, setClients] = useState<ClientWithRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then(setClients)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="mt-1 text-muted-foreground">
              Manage your campaign clients
            </p>
          </div>
          <Link href="/clients/new">
            <Button>+ New Client</Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : clients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="mb-4 text-lg text-muted-foreground">
                No clients yet. Create your first client to get started.
              </p>
              <Link href="/clients/new">
                <Button>+ Create Client</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => {
              const lastRun = client.runs[0];
              return (
                <Link key={client.id} href={`/clients/${client.id}/run`}>
                  <Card className="transition-shadow hover:shadow-md cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {client.name}
                        </CardTitle>
                        {lastRun && (
                          <Badge
                            variant={
                              lastRun.status === "OK"
                                ? "default"
                                : lastRun.status === "WARNING"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {lastRun.status}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="truncate font-mono text-xs">
                        Sheet: {client.processSheetId}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {lastRun ? (
                        <p className="text-sm text-muted-foreground">
                          Last run:{" "}
                          {new Date(lastRun.createdAt).toLocaleDateString()} —
                          Week{" "}
                          {new Date(lastRun.weekStart).toLocaleDateString()}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No runs yet
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
