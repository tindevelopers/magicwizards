import type { Metadata } from "next";
import ConsumerLayout from "@/layout/ConsumerLayout";
import TestWizardBlock from "@/components/wizards/TestWizardBlock";

export const metadata: Metadata = {
  title: "Test Wizard - Magic Wizards",
  description: "Test Magic Wizards agents from the portal",
};

export default function WizardsPage() {
  return (
    <ConsumerLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Test Wizard
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Run a Magic Wizards agent (builder, research, ops, sales) with a
            prompt. Uses your current tenant context.
          </p>
        </div>
        <TestWizardBlock />
      </div>
    </ConsumerLayout>
  );
}
