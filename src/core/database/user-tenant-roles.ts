/**
 * User-Tenant Roles Management
 * 
 * Allows Platform Admins to have tenant-specific roles (e.g., Organization Admin)
 * while maintaining their Platform Admin role for system-level access.
 */

import { createAdminClient } from "./admin-client";
import { createClient } from "./client";
import { createClient as createServerClient } from "./server";
import type { Database } from "./types";

type UserTenantRole = Database["public"]["Tables"]["user_tenant_roles"]["Row"];

/**
 * Get effective role for a user in a tenant context
 * Checks both platform role (users.role_id) and tenant-specific role (user_tenant_roles)
 */
/**
 * Get the appropriate Supabase client (server or client)
 */
async function getSupabaseClient() {
  // Try to use server client first (if available)
  try {
    return await createServerClient();
  } catch {
    // Fall back to browser client if server client not available
    return createClient();
  }
}

export async function getEffectiveRole(
  userId: string,
  tenantId?: string | null
): Promise<{ role: string; roleId: string; source: "platform" | "tenant" } | null> {
  const supabase = await getSupabaseClient();

  // First, get user's platform role
  const { data: user, error: userError } = await supabase
    .from("users")
    .select(`
      role_id,
      roles:role_id (
        id,
        name
      )
    `)
    .eq("id", userId)
    .single();

  if (userError || !user) {
    return null;
  }

  const platformRole = user.roles as { id: string; name: string } | null;

  // If tenant context provided, check for tenant-specific role
  if (tenantId && platformRole?.name === "Platform Admin") {
    const { data: tenantRole, error: tenantRoleError } = await supabase
      .from("user_tenant_roles")
      .select(`
        role_id,
        roles:role_id (
          id,
          name
        )
      `)
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!tenantRoleError && tenantRole) {
      const role = tenantRole.roles as { id: string; name: string } | null;
      if (role) {
        return {
          role: role.name,
          roleId: role.id,
          source: "tenant",
        };
      }
    }
  }

  // Return platform role if no tenant role found
  if (platformRole) {
    return {
      role: platformRole.name,
      roleId: platformRole.id,
      source: "platform",
    };
  }

  return null;
}

/**
 * Get all tenant roles for a user
 */
export async function getUserTenantRoles(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_tenant_roles")
    .select(`
      *,
      tenant_id,
      tenants:tenant_id (
        id,
        name,
        domain
      ),
      roles:role_id (
        id,
        name,
        description
      )
    `)
    .eq("user_id", userId);

  if (error) throw error;
  return data || [];
}

/**
 * Assign a tenant role to a user (typically Platform Admin)
 * Uses admin client to bypass RLS
 */
export async function assignTenantRole(
  userId: string,
  tenantId: string,
  roleName: string
) {
  const adminClient = createAdminClient();

  // Get role ID
  const { data: role, error: roleError } = await adminClient
    .from("roles")
    .select("id")
    .eq("name", roleName)
    .single();

  if (roleError || !role) {
    throw new Error(`Role "${roleName}" not found`);
  }

  // Check if assignment already exists
  const { data: existing } = await adminClient
    .from("user_tenant_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .eq("role_id", role.id)
    .maybeSingle();

  if (existing) {
    return existing; // Already assigned
  }

  // Create assignment
  const { data, error } = await adminClient
    .from("user_tenant_roles")
    .insert({
      user_id: userId,
      tenant_id: tenantId,
      role_id: role.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove a tenant role from a user
 */
export async function removeTenantRole(
  userId: string,
  tenantId: string,
  roleName: string
) {
  const adminClient = createAdminClient();

  // Get role ID
  const { data: role, error: roleError } = await adminClient
    .from("roles")
    .select("id")
    .eq("name", roleName)
    .single();

  if (roleError || !role) {
    throw new Error(`Role "${roleName}" not found`);
  }

  const { error } = await adminClient
    .from("user_tenant_roles")
    .delete()
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .eq("role_id", role.id);

  if (error) throw error;
  return true;
}

/**
 * Check if user has a specific role for a tenant
 */
export async function hasTenantRole(
  userId: string,
  tenantId: string,
  roleName: string
): Promise<boolean> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("user_tenant_roles")
    .select(`
      roles:role_id (
        name
      )
    `)
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error || !data) return false;

  const role = (data.roles as { name: string } | null);
  return role?.name === roleName;
}

/**
 * Get all users with tenant roles for a specific tenant
 */
export async function getTenantRoleUsers(tenantId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_tenant_roles")
    .select(`
      *,
      users:user_id (
        id,
        email,
        full_name,
        avatar_url
      ),
      roles:role_id (
        id,
        name,
        description
      )
    `)
    .eq("tenant_id", tenantId);

  if (error) throw error;
  return data || [];
}

