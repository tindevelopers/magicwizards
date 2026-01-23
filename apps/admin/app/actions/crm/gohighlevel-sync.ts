"use server";

import { createAdminClient } from "@/core/database/admin-client";
import { ConnectionStore, createSupabaseAdminClient } from "@tinadmin/integrations-core";
import { GoHighLevelClient } from "@tinadmin/integration-gohighlevel";
import type { GHLConnectionSecrets } from "@tinadmin/integration-gohighlevel";

/**
 * Helper function to get GoHighLevel connection for a tenant
 */
async function getGHLConnection(tenantId: string) {
  const admin = createAdminClient();
  
  // Get GoHighLevel provider
  const { data: provider } = await (admin as any)
    .from("integration_providers")
    .select("*")
    .eq("slug", "gohighlevel")
    .maybeSingle();

  if (!provider) {
    return null;
  }

  // Check if platform-level enabled
  const { data: platformSettings } = await (admin as any)
    .from("platform_integration_settings")
    .select("*")
    .eq("provider_id", provider.id)
    .maybeSingle();

  if (!platformSettings?.enabled) {
    return null;
  }

  // Get tenant connection
  const store = new ConnectionStore(createSupabaseAdminClient());
  const connection = await store.getTenantConnectionByProviderId({
    tenantId,
    providerId: provider.id,
  });

  if (!connection || connection.status !== "connected") {
    return null;
  }

  const secrets = await store.getConnectionSecrets({ connectionId: connection.id });
  if (!secrets) {
    return null;
  }

  return {
    provider,
    connection,
    secrets: secrets as GHLConnectionSecrets,
  };
}

/**
 * Sync a contact to GoHighLevel (create or update)
 * Returns the GoHighLevel contact ID or null if sync failed
 */
export async function syncContactToGHL(params: {
  tenantId: string;
  contact: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    address?: Record<string, any> | null;
    custom_fields?: Record<string, any> | null;
  };
}): Promise<string | null> {
  try {
    const ghlConnection = await getGHLConnection(params.tenantId);
    if (!ghlConnection) {
      // Not connected or not enabled - silently skip sync
      return null;
    }

    const { secrets } = ghlConnection;
    const accessToken = secrets.oauth.access_token;
    const locationId = secrets.location_id;

    if (!locationId) {
      console.warn("GoHighLevel sync skipped: location_id missing");
      return null;
    }

    const client = new GoHighLevelClient(accessToken);

    // Check if contact already has a GoHighLevel ID stored
    const existingGHLId = params.contact.custom_fields?.gohighlevel_id as string | undefined;

    if (existingGHLId) {
      // Update existing contact
      try {
        await client.updateContact({
          contactId: existingGHLId,
          locationId,
          firstName: params.contact.first_name,
          lastName: params.contact.last_name,
          email: params.contact.email,
          phone: params.contact.phone,
          mobile: params.contact.mobile,
          address: params.contact.address,
          customFields: params.contact.custom_fields,
        });
        return existingGHLId;
      } catch (error: any) {
        // If update fails (e.g., contact deleted in GHL), try creating new one
        console.warn("GoHighLevel contact update failed, creating new:", error.message);
        // Fall through to create new contact
      }
    }

    // Create new contact
    const result = await client.createContact({
      locationId,
      firstName: params.contact.first_name,
      lastName: params.contact.last_name,
      email: params.contact.email,
      phone: params.contact.phone,
      mobile: params.contact.mobile,
      address: params.contact.address,
      customFields: params.contact.custom_fields,
    });

    const ghlContactId = (result as any)?.contact?.id || (result as any)?.id;
    return ghlContactId || null;
  } catch (error: any) {
    // Log error but don't throw - contact creation should succeed even if sync fails
    console.error("Failed to sync contact to GoHighLevel:", error.message);
    return null;
  }
}

/**
 * Delete a contact from GoHighLevel
 */
export async function deleteContactFromGHL(params: {
  tenantId: string;
  ghlContactId: string;
}): Promise<boolean> {
  try {
    const ghlConnection = await getGHLConnection(params.tenantId);
    if (!ghlConnection) {
      return false;
    }

    const { secrets } = ghlConnection;
    const accessToken = secrets.oauth.access_token;
    const locationId = secrets.location_id;

    if (!locationId) {
      return false;
    }

    const client = new GoHighLevelClient(accessToken);
    await client.deleteContact({
      contactId: params.ghlContactId,
      locationId,
    });

    return true;
  } catch (error: any) {
    console.error("Failed to delete contact from GoHighLevel:", error.message);
    return false;
  }
}
