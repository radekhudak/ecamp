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

function extractSheetId(input: string): string {
  const match = input.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  return input.trim();
}

export function ClientForm({ initialData }: ClientFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;

  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [processInitialized, setProcessInitialized] = useState(isEdit);
  const [validating, setValidating] = useState(false);

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    processSheetId: initialData?.processSheetId ?? "",
    masterTab: initialData?.masterTab ?? "Kampaně_vitalpoint",
    nextWeekTab: initialData?.nextWeekTab ?? "NEXT WEEK (Nominace)",
    actualWeekTab: initialData?.actualWeekTab ?? "ACTUAL WEEK (Live Přehled)",
    runLogTab: initialData?.runLogTab ?? "RUN_LOG",
    productSheetId: initialData?.productSheetId ?? "",
    productTab: initialData?.productTab ?? "",
    brandSheetId: initialData?.brandSheetId ?? "",
    brandTab: initialData?.brandTab ?? "",
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

  async function handleInitialize() {
    const sheetId = extractSheetId(form.processSheetId);
    if (!sheetId) {
      toast.error("Zadej Google Sheet ID nebo URL");
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
      if (!res.ok) throw new Error(data.error || "Initialization failed");

      setForm((prev) => ({
        ...prev,
        processSheetId: sheetId,
      }));

      setProcessInitialized(true);
      toast.success(`Sheet "${data.title}" initialized! Tabs: ${data.created.join(", ")}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Initialization failed");
    } finally {
      setInitializing(false);
    }
  }

  async function validateSheet(sheetId: string, sheetName: string) {
    if (!sheetId || !sheetName) {
      toast.error("Vyplň Sheet ID i název listu");
      return;
    }
    setValidating(true);
    try {
      const res = await fetch("/api/sheets/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetId: extractSheetId(sheetId),
          sheetName,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`OK — "${data.title}" / "${sheetName}". Sloupce: ${data.foundColumns?.join(", ")}`);
      } else {
        toast.error(data.error || `Chybějící sloupce: ${data.missingColumns?.join(", ")}`);
      }
    } catch {
      toast.error("Validace selhala");
    } finally {
      setValidating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.productSheetId || !form.productTab) {
      toast.error("Vyplň Product Sales sheet a název listu");
      return;
    }
    if (!form.brandSheetId || !form.brandTab) {
      toast.error("Vyplň Brand Sales sheet a název listu");
      return;
    }

    setSaving(true);

    let guardrails;
    try {
      guardrails = JSON.parse(form.guardrails);
    } catch {
      toast.error("Neplatný JSON v guardrails");
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

      if (!res.ok) throw new Error(await res.text());

      toast.success(isEdit ? "Klient aktualizován" : "Klient vytvořen");
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Uložení selhalo");
    } finally {
      setSaving(false);
    }
  }

  const serviceAccountEmail = "ecamp-sheets@ecamp-planner.iam.gserviceaccount.com";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Klient</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="name">Název klienta</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="např. VitalPoint"
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Process Sheet */}
      <Card>
        <CardHeader>
          <CardTitle>Procesní Sheet</CardTitle>
          <CardDescription>
            Vytvoř prázdný Google Sheet a sdílej ho s{" "}
            <code className="rounded bg-muted px-1 text-xs">
              {serviceAccountEmail}
            </code>{" "}
            jako <strong>Editor</strong>. Aplikace v něm automaticky vytvoří
            listy: MASTER, NEXT WEEK, ACTUAL WEEK a RUN_LOG.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="processSheetId">Google Sheet ID nebo URL</Label>
            <Input
              id="processSheetId"
              value={form.processSheetId}
              onChange={(e) => updateField("processSheetId", e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/xxxxx/edit"
              required
            />
          </div>

          {!processInitialized ? (
            <div className="space-y-3">
              <Alert>
                <p className="text-sm">
                  Klikni <strong>Inicializovat Sheet</strong> — automaticky se
                  vytvoří 4 listy se správným záhlavím a 9 týdnů kampaní.
                </p>
              </Alert>
              <Button
                type="button"
                onClick={handleInitialize}
                disabled={initializing || !form.processSheetId}
              >
                {initializing ? "Inicializuji..." : "Inicializovat Sheet"}
              </Button>
            </div>
          ) : (
            <div className="rounded-md border bg-muted/50 p-3">
              <p className="mb-2 text-sm font-medium text-green-700">
                Procesní Sheet inicializován
              </p>
              <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                <div>MASTER: {form.masterTab}</div>
                <div>NEXT WEEK: {form.nextWeekTab}</div>
                <div>ACTUAL WEEK: {form.actualWeekTab}</div>
                <div>RUN_LOG: {form.runLogTab}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Sales */}
      <Card>
        <CardHeader>
          <CardTitle>Produktová prodejnost</CardTitle>
          <CardDescription>
            Google Sheet s prodejními daty produktů (z analytiky, e-shopu).
            Sdílej ho s{" "}
            <code className="rounded bg-muted px-1 text-xs">
              {serviceAccountEmail}
            </code>{" "}
            jako <strong>Viewer</strong>.
            Očekávané sloupce: Item name, Date, Items viewed, Items added to
            cart, Items purchased, Item revenue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="productSheetId">Google Sheet ID nebo URL</Label>
            <Input
              id="productSheetId"
              value={form.productSheetId}
              onChange={(e) => updateField("productSheetId", e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/xxxxx/edit"
              required
            />
          </div>
          <div>
            <Label htmlFor="productTab">Název listu (tab)</Label>
            <Input
              id="productTab"
              value={form.productTab}
              onChange={(e) => updateField("productTab", e.target.value)}
              placeholder="např. Product Sales"
              required
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={validating || !form.productSheetId || !form.productTab}
            onClick={() => validateSheet(form.productSheetId, form.productTab)}
          >
            {validating ? "Ověřuji..." : "Ověřit přístup"}
          </Button>
        </CardContent>
      </Card>

      {/* Brand Sales */}
      <Card>
        <CardHeader>
          <CardTitle>Brand prodejnost</CardTitle>
          <CardDescription>
            Google Sheet s agregovanými daty po brandech.
            Sdílej ho s{" "}
            <code className="rounded bg-muted px-1 text-xs">
              {serviceAccountEmail}
            </code>{" "}
            jako <strong>Viewer</strong>.
            Očekávané sloupce: Item brand, Items viewed, Items added to cart,
            Items purchased, Item revenue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="brandSheetId">Google Sheet ID nebo URL</Label>
            <Input
              id="brandSheetId"
              value={form.brandSheetId}
              onChange={(e) => updateField("brandSheetId", e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/xxxxx/edit"
              required
            />
          </div>
          <div>
            <Label htmlFor="brandTab">Název listu (tab)</Label>
            <Input
              id="brandTab"
              value={form.brandTab}
              onChange={(e) => updateField("brandTab", e.target.value)}
              placeholder="např. Brand Sales"
              required
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={validating || !form.brandSheetId || !form.brandTab}
            onClick={() => validateSheet(form.brandSheetId, form.brandTab)}
          >
            {validating ? "Ověřuji..." : "Ověřit přístup"}
          </Button>
        </CardContent>
      </Card>

      {/* Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Produktový feed (volitelné)</CardTitle>
          <CardDescription>XML feed URL pro produktový katalog</CardDescription>
        </CardHeader>
        <CardContent>
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

      {/* Guardrails */}
      <Card>
        <CardHeader>
          <CardTitle>Guardrails</CardTitle>
          <CardDescription>
            Konfigurační limity a prahy (JSON)
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
        <Button type="submit" disabled={saving || (!processInitialized && !isEdit)}>
          {saving
            ? "Ukládám..."
            : isEdit
              ? "Aktualizovat klienta"
              : "Vytvořit klienta"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/")}
        >
          Zrušit
        </Button>
      </div>
    </form>
  );
}
