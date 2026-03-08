export type WizardCatalogItem = {
  id: string;
  name: string;
  defaultPrompt: string;
};

export const WIZARD_CATALOG: WizardCatalogItem[] = [
  {
    id: "builder",
    name: "Builder Wizard",
    defaultPrompt:
      "You are Builder Wizard. Ship clean, secure, testable changes, especially for multi-tenant systems.",
  },
  {
    id: "research",
    name: "Research Wizard",
    defaultPrompt:
      "You are Research Wizard. Search broadly, compare sources, cite clearly, and flag uncertainty.",
  },
  {
    id: "ops",
    name: "Ops Wizard",
    defaultPrompt:
      "You are Ops Wizard. Prioritize reliability, observability, and low-risk operational workflows.",
  },
  {
    id: "sales",
    name: "Sales Wizard",
    defaultPrompt:
      "You are Sales Wizard. Be concise, clear, and outcome-focused. Keep messaging practical and measurable.",
  },
  {
    id: "outreach",
    name: "Outreach Wizard",
    defaultPrompt:
      "You are Outreach Wizard. Build actionable outbound campaigns, personalize responsibly, and track measurable outcomes.",
  },
  {
    id: "orchestrator",
    name: "Orchestrator",
    defaultPrompt:
      "You are the orchestrator. Classify intent and route work to the best specialist wizard while minimizing cost.",
  },
];

export const WIZARD_PROVIDER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "App default" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
  { value: "mock", label: "Mock" },
];

export const WIZARD_MODEL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "App default" },
  { value: "gpt-4.1-mini", label: "OpenAI gpt-4.1-mini" },
  { value: "gpt-4o-mini", label: "OpenAI gpt-4o-mini" },
  { value: "claude-sonnet-4", label: "Anthropic claude-sonnet-4" },
  { value: "claude-opus-4-5", label: "Anthropic claude-opus-4-5" },
  { value: "claude-opus-4-6", label: "Anthropic claude-opus-4-6" },
];
