import "server-only";

import { GoHighLevelClient } from "./client";
import type { GHLConnectionSecrets } from "./types";

/**
 * Minimal sync example used as a smoke test for the connector.
 * This intentionally does not persist objects yet; it verifies auth + API access.
 */
export async function syncContacts(params: {
  secrets: GHLConnectionSecrets;
}): Promise<{ ok: true; contactCount?: number }> {
  const accessToken = params.secrets.oauth.access_token;
  const locationId = params.secrets.location_id;

  if (!locationId) {
    throw new Error("GoHighLevel sync requires location_id in connection secrets.");
  }

  const client = new GoHighLevelClient(accessToken);
  const res = await client.listContacts({ locationId, limit: 1, offset: 0 });
  const count = (res as any)?.meta?.total ?? undefined;

  return { ok: true, contactCount: count };
}

