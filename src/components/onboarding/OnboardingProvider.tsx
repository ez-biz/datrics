"use client";

import { useState } from "react";
import { OnboardingWizard } from "./OnboardingWizard";

interface OnboardingProviderProps {
  shouldShow: boolean;
}

export function OnboardingProvider({ shouldShow }: OnboardingProviderProps) {
  const [open, setOpen] = useState(shouldShow);

  if (!shouldShow) return null;

  return <OnboardingWizard open={open} onClose={() => setOpen(false)} />;
}
