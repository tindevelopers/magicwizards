import cors from "cors";
import express from "express";
import { registerApprovalHandler } from "@magicwizards/wizards-core";
import { appConfig } from "./config.js";
import { createDevRouter } from "./dev-router.js";
import { createMcpTelephonyRouter } from "./routes/mcp-telephony.js";
import {
  createLeadDiscoveryMcpRouter,
  createEmailOutreachMcpRouter,
  createCampaignTrackerMcpRouter,
  createEmailWebhookRouter,
} from "@magicwizards/outreach";
import { createOutreachContext } from "./outreach/context-factory.js";
import { logger } from "./logger.js";
import { createTelegramWebhookRouter } from "./telegram/webhook.js";
import { processDueTasks } from "./services/scheduler.js";
import { telegramApprovalHandler } from "./telegram/approval-handler.js";

registerApprovalHandler("telegram", telegramApprovalHandler);

const app = express();
app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "magicwizards-wizards-api",
    env: appConfig.nodeEnv,
  });
});

app.use("/webhooks", createTelegramWebhookRouter());

// Built-in MCP endpoint for telephony (tenant-scoped via path)
app.use("/mcp/telephony/:tenantId", createMcpTelephonyRouter());

// Outreach MCP endpoints (tenant-scoped via path)
app.use("/mcp/lead-discovery/:tenantId", createLeadDiscoveryMcpRouter(createOutreachContext));
app.use("/mcp/email-outreach/:tenantId", createEmailOutreachMcpRouter(createOutreachContext));
app.use("/mcp/campaign-tracker/:tenantId", createCampaignTrackerMcpRouter(createOutreachContext));

// Email tracking webhooks (Resend, SendGrid, SES)
app.use("/webhooks/email", createEmailWebhookRouter(createOutreachContext));

// Cron endpoint: Cloud Scheduler hits this every 60 seconds
app.post("/cron/run-due-tasks", async (_req, res) => {
  try {
    const result = await processDueTasks();
    logger.info("cron_run_due_tasks", result);
    res.json({ status: "ok", ...result });
  } catch (error) {
    logger.error("cron_run_due_tasks_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    res.status(500).json({ status: "error" });
  }
});

if (appConfig.nodeEnv === "development") {
  app.use("/dev", createDevRouter());
  logger.info("dev_routes_enabled", { path: "/dev/run-wizard" });
}

const host = process.env.HOST ?? "0.0.0.0";
const server = app.listen(appConfig.port, host, () => {
  logger.info("wizards_api_started", { host, port: appConfig.port });
});

function shutdown(signal: string): void {
  logger.info("wizards_api_shutting_down", { signal });
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
