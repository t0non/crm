import type { NextRequest } from "next/server";

import { POST as receberAviso } from "@/app/api/v1/webhooks/cobranca/[provedor]/route";

export function POST(request: NextRequest) {
  return receberAviso(request, { params: Promise.resolve({ provedor: "asaas" }) });
}
