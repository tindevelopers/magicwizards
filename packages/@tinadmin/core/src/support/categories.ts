"use server";

import { createClient } from "@/core/database/server";
import { createTenantAwareClient, getSupabaseClient } from "@/core/database/tenant-client";
import type { SupportCategory, CreateCategoryInput } from "./types";

/**
 * Get all support categories for the current tenant
 */
export async function getSupportCategories(tenantId?: string): Promise<SupportCategory[]> {
  const client = tenantId 
    ? await createTenantAwareClient(tenantId)
    : await createClient();
  const supabase = getSupabaseClient(client);
  
  const { data, error } = await supabase
    .from("support_categories")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });
  
  if (error) {
    throw new Error(`Failed to fetch support categories: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Get a support category by ID
 */
export async function getSupportCategoryById(
  categoryId: string,
  tenantId?: string
): Promise<SupportCategory | null> {
  const client = tenantId 
    ? await createTenantAwareClient(tenantId)
    : await createClient();
  const supabase = getSupabaseClient(client);
  
  const { data, error } = await supabase
    .from("support_categories")
    .select("*")
    .eq("id", categoryId)
    .single();
  
  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to fetch support category: ${error.message}`);
  }
  
  return data;
}

/**
 * Create a new support category
 */
export async function createSupportCategory(
  input: CreateCategoryInput,
  tenantId?: string
): Promise<SupportCategory> {
  const client = tenantId 
    ? await createTenantAwareClient(tenantId)
    : await createClient();
  const supabase = getSupabaseClient(client);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  
  // Get tenant_id from user if not provided
  let finalTenantId = tenantId;
  if (!finalTenantId) {
    const { data: userData } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();
    
    if (!userData || !(userData as { tenant_id: string }).tenant_id) {
      throw new Error("User does not belong to a tenant");
    }
    finalTenantId = (userData as { tenant_id: string }).tenant_id;
  }
  
  const { data, error } = await supabase
    .from("support_categories")
    .insert({
      tenant_id: finalTenantId as string,
      name: input.name,
      description: input.description || null,
      is_active: input.is_active !== undefined ? input.is_active : true,
    } as any)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create support category: ${error.message}`);
  }
  
  return data;
}

/**
 * Update a support category
 */
export async function updateSupportCategory(
  categoryId: string,
  input: Partial<CreateCategoryInput>,
  tenantId?: string
): Promise<SupportCategory> {
  const client = tenantId 
    ? await createTenantAwareClient(tenantId)
    : await createClient();
  const supabase = getSupabaseClient(client);
  
  const updateData: Record<string, any> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;
  
  const { data, error } = await (supabase
    .from("support_categories") as any)
    .update(updateData)
    .eq("id", categoryId)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to update support category: ${error.message}`);
  }
  
  return data;
}

/**
 * Delete a support category (soft delete by setting is_active to false)
 */
export async function deleteSupportCategory(
  categoryId: string,
  tenantId?: string
): Promise<void> {
  await updateSupportCategory(categoryId, { is_active: false }, tenantId);
}

