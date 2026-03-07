import type {
  CampaignRepository,
  SequenceRepository,
  LeadRepository,
  EmailLogRepository,
  EmailProviderRepository,
} from "./repositories.js";

import type {
  EmailSender,
  DiscoveryAdapter,
  TaskScheduler,
  CrmPromoter,
} from "./interfaces.js";

/**
 * Dependency container injected by the consuming application.
 *
 * All repositories and adapters are provided by the host, keeping
 * the package database- and provider-agnostic.
 */
export interface OutreachContext {
  repos: {
    campaigns: CampaignRepository;
    sequences: SequenceRepository;
    leads: LeadRepository;
    emailLog: EmailLogRepository;
    emailProvider: EmailProviderRepository;
  };
  adapters: {
    emailSender: EmailSender;
    discovery: DiscoveryAdapter;
    /** Optional — campaigns cannot be scheduled if absent. */
    scheduler?: TaskScheduler;
    /** Optional — leads cannot be promoted to CRM if absent. */
    crm?: CrmPromoter;
  };
}
