import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenant } from "@/core/multi-tenancy/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WIZARDS_API_URL =
  process.env.WIZARDS_API_URL ?? "http://localhost:8787";

interface RunWizardBody {
  prompt: string;
  wizardId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = await getCurrentTenant();
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 400 }
      );
    }

    const body = (await req.json()) as RunWizardBody;
    const { prompt, wizardId } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const res = await fetch(`${WIZARDS_API_URL}/dev/run-wizard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId,
        prompt: prompt.trim(),
        ...(wizardId && { wizardId: wizardId.trim() }),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: (data as { error?: string }).error ?? "Wizard run failed" },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("run-wizard proxy error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to run wizard",
      },
      { status: 500 }
    );
  }
}
