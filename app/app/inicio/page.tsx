import type { Metadata } from "next";

import { requireAuth } from "@/lib/auth/server";

import { InicioClient } from "./_client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Início" };

export default async function InicioPage() {
  await requireAuth();
  return <InicioClient />;
}
