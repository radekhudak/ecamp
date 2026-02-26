"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { NavHeader } from "@/components/nav-header";
import { ClientForm } from "@/components/client-form";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ClientSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/clients/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setClient)
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this client? This action cannot be undone.")) {
      return;
    }

    const res = await fetch(`/api/clients/${params.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Client deleted");
      router.push("/");
    } else {
      toast.error("Failed to delete client");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </main>
      </div>
    );
  }

  if (!client) return null;

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            Settings: {client.name as string}
          </h1>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            Delete Client
          </Button>
        </div>
        <ClientForm initialData={client as ClientFormProps["initialData"]} />
      </main>
    </div>
  );
}

type ClientFormProps = React.ComponentProps<typeof ClientForm>;
