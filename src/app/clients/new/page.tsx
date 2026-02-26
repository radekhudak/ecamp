"use client";

import { NavHeader } from "@/components/nav-header";
import { ClientForm } from "@/components/client-form";

export default function NewClientPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold">New Client</h1>
        <ClientForm />
      </main>
    </div>
  );
}
