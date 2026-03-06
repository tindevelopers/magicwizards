/**
 * Unified Telephony MCP Adapter.
 *
 * Presents a provider-agnostic interface to the agent (make_call, send_sms, etc.)
 * and routes to the tenant's chosen telephony provider (Telnyx, Vapi, or Twilio).
 *
 * The tenant admin picks the provider and enters the API key in the admin panel.
 * The agent always sees the same tool names regardless of provider.
 */
import { logger } from "../logger.js";
import { resolveCredential } from "./token-proxy.js";

export type TelephonyProvider = "telnyx" | "vapi" | "twilio";

export interface MakeCallInput {
  to: string;
  assistant_prompt?: string;
  from?: string;
}

export interface ScheduleCallInput {
  to: string;
  assistant_prompt?: string;
  scheduled_at: string;
  from?: string;
}

export interface SendSmsInput {
  to: string;
  body: string;
  from?: string;
}

export interface ListCallsInput {
  limit?: number;
}

export interface CallControlInput {
  call_id: string;
  action: "transfer" | "hangup" | "dtmf";
  target?: string;
}

export type TelephonyToolName =
  | "make_call"
  | "schedule_call"
  | "send_sms"
  | "list_calls"
  | "call_control";

interface ProviderAdapter {
  makeCall(input: MakeCallInput, apiKey: string): Promise<unknown>;
  scheduleCall(input: ScheduleCallInput, apiKey: string): Promise<unknown>;
  sendSms(input: SendSmsInput, apiKey: string): Promise<unknown>;
  listCalls(input: ListCallsInput, apiKey: string): Promise<unknown>;
  callControl(input: CallControlInput, apiKey: string): Promise<unknown>;
}

// ---- Telnyx Provider ----

const telnyxAdapter: ProviderAdapter = {
  async makeCall(input, apiKey) {
    const response = await fetch("https://api.telnyx.com/v2/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: input.to,
        from: input.from,
        connection_id: "default",
        answering_machine_detection: "detect",
        ...(input.assistant_prompt && {
          client_state: Buffer.from(
            JSON.stringify({ prompt: input.assistant_prompt }),
          ).toString("base64"),
        }),
      }),
    });
    return response.json();
  },

  async scheduleCall(input, apiKey) {
    return {
      status: "scheduled",
      to: input.to,
      scheduled_at: input.scheduled_at,
      provider: "telnyx",
    };
  },

  async sendSms(input, apiKey) {
    const response = await fetch("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: input.to,
        from: input.from,
        text: input.body,
        type: "SMS",
      }),
    });
    return response.json();
  },

  async listCalls(input, apiKey) {
    const limit = input.limit ?? 10;
    const response = await fetch(
      `https://api.telnyx.com/v2/calls?page[size]=${limit}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    return response.json();
  },

  async callControl(input, apiKey) {
    const actionMap: Record<string, string> = {
      hangup: "hangup",
      transfer: "transfer",
      dtmf: "send_dtmf",
    };
    const response = await fetch(
      `https://api.telnyx.com/v2/calls/${input.call_id}/actions/${actionMap[input.action]}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          input.action === "transfer" ? { to: input.target } : {},
        ),
      },
    );
    return response.json();
  },
};

// ---- Vapi Provider ----

const vapiAdapter: ProviderAdapter = {
  async makeCall(input, apiKey) {
    const response = await fetch("https://api.vapi.ai/call/phone", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumberId: input.from,
        customer: { number: input.to },
        ...(input.assistant_prompt && {
          assistant: {
            firstMessage: "Hello, I'm calling on behalf of your team.",
            model: {
              provider: "openai",
              model: "gpt-4.1-mini",
              messages: [{ role: "system", content: input.assistant_prompt }],
            },
          },
        }),
      }),
    });
    return response.json();
  },

  async scheduleCall(input, apiKey) {
    return {
      status: "scheduled",
      to: input.to,
      scheduled_at: input.scheduled_at,
      provider: "vapi",
    };
  },

  async sendSms(_input, _apiKey) {
    return { error: "Vapi does not support SMS. Consider switching to Telnyx or Twilio." };
  },

  async listCalls(input, apiKey) {
    const limit = input.limit ?? 10;
    const response = await fetch(
      `https://api.vapi.ai/call?limit=${limit}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    return response.json();
  },

  async callControl(input, apiKey) {
    if (input.action === "hangup") {
      const response = await fetch(
        `https://api.vapi.ai/call/${input.call_id}/stop`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
        },
      );
      return response.json();
    }
    return { error: `Vapi does not support call control action: ${input.action}` };
  },
};

// ---- Twilio Provider ----

const twilioAdapter: ProviderAdapter = {
  async makeCall(input, apiKey) {
    const [accountSid, authToken] = apiKey.split(":");
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: input.to,
          From: input.from ?? "",
          Url: "http://twimlets.com/holdmusic?Bucket=com.twilio.music.ambient",
          ...(input.assistant_prompt && {
            Twiml: `<Response><Say>${input.assistant_prompt}</Say></Response>`,
          }),
        }),
      },
    );
    return response.json();
  },

  async scheduleCall(input, apiKey) {
    return {
      status: "scheduled",
      to: input.to,
      scheduled_at: input.scheduled_at,
      provider: "twilio",
    };
  },

  async sendSms(input, apiKey) {
    const [accountSid, authToken] = apiKey.split(":");
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: input.to,
          From: input.from ?? "",
          Body: input.body,
        }),
      },
    );
    return response.json();
  },

  async listCalls(input, apiKey) {
    const [accountSid, authToken] = apiKey.split(":");
    const limit = input.limit ?? 10;
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json?PageSize=${limit}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
      },
    );
    return response.json();
  },

  async callControl(input, apiKey) {
    const [accountSid, authToken] = apiKey.split(":");
    if (input.action === "hangup") {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${input.call_id}.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ Status: "completed" }),
        },
      );
      return response.json();
    }
    return { error: `Twilio call control action "${input.action}" not yet implemented.` };
  },
};

// ---- Provider Registry ----

const providers: Record<TelephonyProvider, ProviderAdapter> = {
  telnyx: telnyxAdapter,
  vapi: vapiAdapter,
  twilio: twilioAdapter,
};

/**
 * Resolve which telephony provider a tenant is using by checking
 * integration_connections for an active telephony connection.
 */
export async function resolveTelephonyProvider(
  tenantId: string,
  userId?: string,
): Promise<{ provider: TelephonyProvider; apiKey: string } | null> {
  const telephonyProviders: TelephonyProvider[] = ["telnyx", "vapi", "twilio"];

  for (const slug of telephonyProviders) {
    const credential = await resolveCredential(tenantId, userId, slug);
    if (credential) {
      const raw =
        (credential.secrets as Record<string, unknown>).api_key ??
        (credential.secrets as Record<string, unknown>).access_token;
      const apiKey = typeof raw === "string" ? raw : "";
      if (apiKey) {
        return { provider: slug, apiKey };
      }
    }
  }

  return null;
}

/**
 * Execute a telephony tool call through the unified adapter.
 */
export async function executeTelephonyTool(opts: {
  tenantId: string;
  userId?: string;
  toolName: TelephonyToolName;
  args: Record<string, unknown>;
}): Promise<unknown> {
  const resolved = await resolveTelephonyProvider(opts.tenantId, opts.userId);
  if (!resolved) {
    return {
      error: "No telephony provider configured. Ask your admin to set up Telnyx, Vapi, or Twilio.",
    };
  }

  const adapter = providers[resolved.provider];
  const startMs = Date.now();

  try {
    const args = opts.args as unknown;
    let result: unknown;
    switch (opts.toolName) {
      case "make_call":
        result = await adapter.makeCall(args as MakeCallInput, resolved.apiKey);
        break;
      case "schedule_call":
        result = await adapter.scheduleCall(args as ScheduleCallInput, resolved.apiKey);
        break;
      case "send_sms":
        result = await adapter.sendSms(args as SendSmsInput, resolved.apiKey);
        break;
      case "list_calls":
        result = await adapter.listCalls(args as ListCallsInput, resolved.apiKey);
        break;
      case "call_control":
        result = await adapter.callControl(args as CallControlInput, resolved.apiKey);
        break;
      default:
        result = { error: `Unknown telephony tool: ${opts.toolName}` };
    }

    logger.info("telephony_tool_call", {
      tenantId: opts.tenantId,
      provider: resolved.provider,
      tool: opts.toolName,
      latencyMs: Date.now() - startMs,
    });

    return result;
  } catch (error) {
    logger.error("telephony_tool_call_failed", {
      tenantId: opts.tenantId,
      provider: resolved.provider,
      tool: opts.toolName,
      error: error instanceof Error ? error.message : "unknown",
    });
    return { error: error instanceof Error ? error.message : "Telephony call failed" };
  }
}
