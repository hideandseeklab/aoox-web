/** Mirrors OnboardingDto in aoox-api (onboarding module). */
export interface OnboardingStep {
  id: "registry" | "proxy" | "panelDomain" | "project" | "workload"
  title: string
  hint: string
  done: boolean
  /** Optional steps never keep the checklist on screen. */
  optional: boolean
  /** Page where the step is done, inside the web app. */
  href: string
}

export interface Onboarding {
  /** Owner, not dismissed, and a required step is still open. */
  visible: boolean
  dismissed: boolean
  steps: OnboardingStep[]
}
