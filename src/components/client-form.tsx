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

  async function validateSheet(sheetId: string, sheetName: string) {
    setValidating(true);
    try {
      const res = await fetch("/api/sheets/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId: sheetId, sheetName }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`Sheet "${data.title}" — tab "${sheetName}" is accessible. Columns: ${data.foundColumns?.join(", ")}`);
      } else {
        toast.error(data.error || `Missing columns: ${data.missingColumns?.join(", ")}`);
      }
    } catch {
      toast.error("Validation request failed");
    } finally {
      setValidating(false);
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
          <CardTitle>Process Sheet</CardTitle>
          <CardDescription>
            The main Google Sheet containing campaign data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="processSheetId">Google Sheet ID</Label>
            <Input
              id="processSheetId"
              value={form.processSheetId}
              onChange={(e) => updateField("processSheetId", e.target.value)}
              placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="masterTab">MASTER Tab</Label>
              <Input
                id="masterTab"
                value={form.masterTab}
                onChange={(e) => updateField("masterTab", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="nextWeekTab">NEXT WEEK Tab</Label>
              <Input
                id="nextWeekTab"
                value={form.nextWeekTab}
                onChange={(e) => updateField("nextWeekTab", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="actualWeekTab">ACTUAL WEEK Tab</Label>
              <Input
                id="actualWeekTab"
                value={form.actualWeekTab}
                onChange={(e) => updateField("actualWeekTab", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="runLogTab">RUN_LOG Tab</Label>
              <Input
                id="runLogTab"
                value={form.runLogTab}
                onChange={(e) => updateField("runLogTab", e.target.value)}
              />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={validating || !form.processSheetId}
            onClick={() => validateSheet(form.processSheetId, form.masterTab)}
          >
            {validating ? "Validating..." : "Validate Process Sheet"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product Sales Sheet</CardTitle>
          <CardDescription>
            Google Sheet with product-level sales data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="productSheetId">Google Sheet ID</Label>
            <Input
              id="productSheetId"
              value={form.productSheetId}
              onChange={(e) => updateField("productSheetId", e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="productTab">Tab Name</Label>
            <Input
              id="productTab"
              value={form.productTab}
              onChange={(e) => updateField("productTab", e.target.value)}
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
            {validating ? "Validating..." : "Validate"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand Sales Sheet</CardTitle>
          <CardDescription>
            Google Sheet with brand-level aggregated data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="brandSheetId">Google Sheet ID</Label>
            <Input
              id="brandSheetId"
              value={form.brandSheetId}
              onChange={(e) => updateField("brandSheetId", e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="brandTab">Tab Name</Label>
            <Input
              id="brandTab"
              value={form.brandTab}
              onChange={(e) => updateField("brandTab", e.target.value)}
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
            {validating ? "Validating..." : "Validate"}
          </Button>
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
        <Button type="submit" disabled={saving}>
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
