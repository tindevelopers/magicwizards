export interface TelegramUser {
  id: number;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
}

export interface TelegramMessage {
  message_id: number;
  chat: TelegramChat;
  from?: TelegramUser;
  text?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface TenantIdentity {
  tenantId: string;
  userId?: string;
}

export interface TenantConfig {
  id: string;
  plan: string;
  status: string;
  wizardProvider?: string | null;
  wizardModel?: string | null;
  wizardBudgetUsd?: number | null;
}
