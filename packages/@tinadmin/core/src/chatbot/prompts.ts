/**
 * SYSTEM PROMPTS AND TEMPLATES
 * 
 * Prompts for the chatbot system.
 */

export const SYSTEM_PROMPTS = {
  default: `You are a helpful AI assistant for a multi-tenant SaaS platform. You help users understand and use the platform's features.

Your knowledge includes:
- Authentication and user management
- Multi-tenancy and tenant isolation
- Billing and subscriptions
- Permissions and access control
- Database and data access patterns
- Platform architecture and best practices

When answering questions:
1. Be concise and accurate
2. Provide code examples when relevant
3. Cite sources when referencing documentation
4. If you don't know something, say so rather than guessing
5. Respect tenant boundaries - don't share data across tenants`,

  domainSpecific: (domain: string) => `You are a specialized AI assistant for the ${domain} domain of a multi-tenant SaaS platform.

Focus on:
- ${domain}-specific functionality
- Best practices for ${domain}
- Common use cases and patterns
- Integration with other platform domains

Provide accurate, domain-specific guidance while respecting tenant isolation.`,

  withContext: (context: string[]) => {
    const contextText = context.length > 0
      ? `\n\nRelevant context:\n${context.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
      : '';
    
    return `${SYSTEM_PROMPTS.default}${contextText}`;
  },
};

export const USER_PROMPTS = {
  domainQuery: (query: string, domain?: string) => {
    if (domain) {
      return `[${domain} domain] ${query}`;
    }
    return query;
  },
};

export function buildSystemPrompt(options: {
  domain?: string;
  context?: string[];
  customInstructions?: string;
}): string {
  const { domain, context, customInstructions } = options;
  
  let prompt = domain
    ? SYSTEM_PROMPTS.domainSpecific(domain)
    : SYSTEM_PROMPTS.default;
  
  if (context && context.length > 0) {
    prompt = SYSTEM_PROMPTS.withContext(context);
  }
  
  if (customInstructions) {
    prompt += `\n\nAdditional instructions:\n${customInstructions}`;
  }
  
  return prompt;
}

