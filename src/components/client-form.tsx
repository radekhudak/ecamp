"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert } from "@/components/ui/alert";
import { toast } from "sonner";
import { DEFAULT_GUARDRAILS } from "@/lib/types";

interface ClientFormProps {
  initialData?: {
    id: string;
    name: string;
    processSheetId: string;
    masterTab: string;
    nextWeekTab: string;
    actualWeekTab: string;
    runLogTab: string;
    productSheetId: string;
    productTab: string;
    brandSheetId: string;
    brandTab: string;
    feedUrl?: string | null;
    feedTagMapping?: unknown;
    guardrails?: unknown;
  };
}

export function ClientForm({ initialData }: ClientFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;

  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [initialized, setInitialized] = useState(isEdit);

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    processSheetId: initialData?.processSheetId ?? "",
    masterTab: initialData?.masterTab ?? "Kampaně_vitalpoint",
    nextWeekTab: initialData?.nextWeekTab ?? "NEXT WEEK (Nominace)",
    actualWeekTab: initialData?.actualWeekTab ?? "ACTUAL WEEK (Live Přehled)",
    runLogTab: initialData?.runLogTab ?? "RUN_LOG",
    productSheetId: initialData?.productSheetId ?? "",
    productTab: initialData?.productTab ?? "Product Sales",
    brandSheetId: initialData?.brandSheetId ?? "",
    brandTab: initialData?.brandTab ?? "Brand Sales",
    feedUrl: initialData?.feedUrl ?? "",
    guardrails: JSON.stringify(
      initialData?.guardrails ?? DEFAULT_GUARDRAILS,
      null,
      2
    ),
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  function extractSheetId(input: string): string {
    const match = input.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    return input.trim();
  }

  async function handleInitialize() {
    const sheetId = extractSheetId(form.processSheetId);
    if (!sheetId) {
      toast.error("Enter a Google Sheet ID or URL first");
      return;
    }

    setInitializing(true);
    try {
      const res = await fetch("/api/sheets/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId: sheetId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Initialization failed");
      }

      setForm((prev) => ({
        ...prev,
        processSheetId: data.config.processSheetId,
        masterTab: data.config.masterTab,
        nextWeekTab: data.config.nextWeekTab,
        actualWeekTab: data.config.actualWeekTab,
        runLogTab: data.config.runLogTab,
        productSheetId: data.config.productSheetId,
        productTab: data.config.productTab,
        brandSheetId: data.config.brandSheetId,
        brandTab: data.config.brandTab,
      }));

      setInitialized(true);
      toast.success(`Sheet initialized! Created tabs: ${data.created.join(", ")}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Initialization failed");
    } finally {
      setInitializing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    let guardrails;
    try {
      guardrails = JSON.parse(form.guardrails);
    } catch {
      toast.error("Invalid JSON in guardrails");
      setSaving(false);
      return;
    }

    const payload = {
      ...form,
      processSheetId: extractSheetId(form.processSheetId),
      productSheetId: extractSheetId(form.productSheetId),
      brandSheetId: extractSheetId(form.brandSheetId),
      feedUrl: form.feedUrl || null,
      guardrails,
    };

    try {
      const url = isEdit ? `/api/clients/${initialData.id}` : "/api/clients";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      toast.success(isEdit ? "Client updated" : "Client created");
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Client Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google Sheet</CardTitle>
          <CardDescription>
            Create an empty Google Sheet, share it with{" "}
            <code className="rounded bg-muted px-1 text-xs">
              ecamp-sheets@ecamp-planner.iam.gserviceaccount.com
            </code>{" "}
            as Editor, then paste the Sheet ID or URL below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="processSheetId">Google Sheet ID or URL</Label>
            <Input
              id="processSheetId"
              value={form.processSheetId}
              onChange={(e) => updateField("processSheetId", e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/xxxxx/edit or just the ID"
              required
            />
          </div>

          {!initialized && (
            <div className="space-y-3">
              <Alert>
                <p className="text-sm">
                  Click <strong>Initialize Sheet</strong> to automatically
                  create all required tabs (MASTER, NEXT WEEK, ACTUAL WEEK,
                  RUN_LOG, Product Sales, Brand Sales) with correct headers
                  and 9 weeks of campaign rows.
                </p>
              </Alert>
              <Button
                type="button"
                onClick={handleInitialize}
                disabled={initializing || !form.processSheetId}
              >
                {initializing ? "Initializing..." : "Initialize Sheet"}
              </Button>
            </div>
          )}

          {initialized && (
            <div className="rounded-md border bg-muted/50 p-3">
              <p className="mb-2 text-sm font-medium text-green-700">
                Sheet initialized with all tabs
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>MASTER: {form.masterTab}</div>
                <div>NEXT WEEK: {form.nextWeekTab}</div>
                <div>ACTUAL WEEK: {form.actualWeekTab}</div>
                <div>RUN_LOG: {form.runLogTab}</div>
                <div>Product Sales: {form.productTab}</div>
                <div>Brand Sales: {form.brandTab}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product Feed (Optional)</CardTitle>
          <CardDescription>XML feed URL for product catalog</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="feedUrl">Feed URL</Label>
            <Input
              id="feedUrl"
              value={form.feedUrl}
              onChange={(e) => updateField("feedUrl", e.target.value)}
              placeholder="https://example.com/feed.xml"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Guardrails</CardTitle>
          <CardDescription>
            Configuration limits and thresholds (JSON)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.guardrails}
            onChange={(e) => updateField("guardrails", e.target.value)}
            className="font-mono text-sm"
            rows={12}
          />
        </CardContent>
      </Card>

      <Separator />

      <div className="flex gap-4">
        <Button type="submit" disabled={saving || (!initialized && !isEdit)}>
          {saving ? "Saving..." : isEdit ? "Update Client" : "Create Client"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
