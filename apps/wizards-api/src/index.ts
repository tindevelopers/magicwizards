import cors from "cors";
import express from "express";
import { appConfig } from "./config.js";
import { createDevRouter } from "./dev-router.js";
import { logger } from "./logger.js";
import { createTelegramWebhookRouter } from "./telegram/webhook.js";

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
