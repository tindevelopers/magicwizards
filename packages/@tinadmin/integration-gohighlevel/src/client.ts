import "server-only";

import type { GHLApiError } from "./types";

const DEFAULT_BASE_URL = "https://services.leadconnectorhq.com";

export class GoHighLevelClient {
  constructor(
    private accessToken: string,
    private baseUrl: string = DEFAULT_BASE_URL
  ) {}

  private async request<T>(
    path: string,
    options?: { method?: string; headers?: Record<string, string>; body?: any }
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: options?.method ?? "GET",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await res.text();
    const json = text ? safeJson(text) : null;

    if (!res.ok) {
      const err: GHLApiError = {
        message: (json as any)?.message ?? `GHL request failed: ${res.status}`,
        status: res.status,
        details: json,
      };
      throw new Error(JSON.stringify(err));
    }

    return (json ?? {}) as T;
  }

  // Minimal endpoints we need to prove the connector works
  async listContacts(params: { locationId: string; limit?: number; offset?: number }) {
    const q = new URLSearchParams();
    q.set("locationId", params.locationId);
    if (params.limit) q.set("limit", String(params.limit));
    if (params.offset) q.set("offset", String(params.offset));
    return this.request<any>(`/contacts/?${q.toString()}`);
  }

  /**
   * Create a contact in GoHighLevel
   */
  async createContact(params: {
    locationId: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    address?: Record<string, any> | null;
    customFields?: Record<string, any>;
  }) {
    const body: any = {
      firstName: params.firstName,
      lastName: params.lastName,
      locationId: params.locationId,
    };

    if (params.email) body.email = params.email;
    if (params.phone) body.phone = params.phone;
    if (params.mobile) body.mobile = params.mobile;
    if (params.address) {
      body.address1 = params.address.address1 || params.address.street;
      body.city = params.address.city;
      body.state = params.address.state;
      body.postalCode = params.address.postalCode || params.address.zip;
      body.country = params.address.country;
    }
    if (params.customFields) {
      body.customField = params.customFields;
    }

    return this.request<any>("/contacts/", {
      method: "POST",
      body,
    });
  }

  /**
   * Update a contact in GoHighLevel
   */
  async updateContact(params: {
    contactId: string;
    locationId: string;
    firstName?: string;
    lastName?: string;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    address?: Record<string, any> | null;
    customFields?: Record<string, any>;
  }) {
    const body: any = {
      locationId: params.locationId,
    };

    if (params.firstName !== undefined) body.firstName = params.firstName;
    if (params.lastName !== undefined) body.lastName = params.lastName;
    if (params.email !== undefined) body.email = params.email;
    if (params.phone !== undefined) body.phone = params.phone;
    if (params.mobile !== undefined) body.mobile = params.mobile;
    if (params.address !== undefined) {
      if (params.address) {
        body.address1 = params.address.address1 || params.address.street;
        body.city = params.address.city;
        body.state = params.address.state;
        body.postalCode = params.address.postalCode || params.address.zip;
        body.country = params.address.country;
      }
    }
    if (params.customFields !== undefined) {
      body.customField = params.customFields;
    }

    return this.request<any>(`/contacts/${params.contactId}`, {
      method: "PUT",
      body,
    });
  }

  /**
   * Delete a contact in GoHighLevel
   */
  async deleteContact(params: { contactId: string; locationId: string }) {
    const q = new URLSearchParams();
    q.set("locationId", params.locationId);
    return this.request<any>(`/contacts/${params.contactId}?${q.toString()}`, {
      method: "DELETE",
    });
  }
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

