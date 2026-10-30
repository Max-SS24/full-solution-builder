// Every step below was read and confirmed on the official VA.gov page it links to.
export const VA_GUIDE_CHECKED = "2026-10-28";

export type VaStage = "not_applied" | "applied" | "registered";
const ALL: VaStage[] = ["not_applied", "applied", "registered"];
export type VaStep = { title: string; detail: string; url: string; linkLabel: string; checked: string; stages?: VaStage[] };

export const VA_GUIDE: VaStep[] = [
  {
    title: "If you're in crisis, get help now",
    detail: "Call 988 and select 1 (TTY: 711, then 988), call 911, or go directly to your nearest VA medical center. Discharge status and enrollment don't matter.",
    url: "https://www.va.gov/health-care/health-needs-conditions/mental-health/",
    checked: VA_GUIDE_CHECKED,
    linkLabel: "VA mental health care",
  },
  {
    title: "You can start mental health care before you enroll",
    detail: "Call or walk in to any VA medical center, any time, day or night, or any Vet Center during clinic hours. You can use some VA mental health services even if you're not enrolled in VA health care.",
    url: "https://www.va.gov/health-care/health-needs-conditions/mental-health/",
    checked: VA_GUIDE_CHECKED,
    linkLabel: "How to get mental health care",
    stages: ["not_applied", "applied"],
  },
  {
    title: "Ask your VA provider for a mental health appointment",
    detail: "If you're already using VA medical services, ask your primary care provider to help you make an appointment with a VA mental health provider.",
    url: "https://www.va.gov/health-care/health-needs-conditions/mental-health/",
    checked: VA_GUIDE_CHECKED,
    linkLabel: "How do I schedule my first appointment?",
    stages: ["registered"],
  },
  {
    title: "Apply for VA health care (VA Form 10-10EZ)",
    detail: "Apply online, by phone at 877-222-8387 (Monday to Friday, 8:00 a.m. to 8:00 p.m. ET), by mail, or in person at your nearest VA medical center or clinic with a signed VA Form 10-10EZ.",
    url: "https://www.va.gov/health-care/how-to-apply/",
    checked: VA_GUIDE_CHECKED,
    linkLabel: "How to apply",
    stages: ["not_applied"],
  },
  {
    title: "After you apply: wait for your welcome call",
    detail: "If more than a week has passed since you applied and VA hasn't contacted you, don't apply again. Call 877-222-8387 (TTY: 711). Once approved, VA will call to welcome you and help you schedule your first appointment.",
    url: "https://www.va.gov/health-care/after-you-apply/",
    checked: VA_GUIDE_CHECKED,
    linkLabel: "After you apply for VA health care",
    stages: ["applied"],
  },
  {
    title: "Find your nearest VA medical center or Vet Center",
    detail: "Use the VA facility locator, or call 877-222-8387 to find the right resources for your needs (TTY: 800-877-8339).",
    url: "https://www.va.gov/find-locations/",
    checked: VA_GUIDE_CHECKED,
    linkLabel: "Find VA locations",
    stages: ["not_applied", "applied"],
  },
  {
    title: "Vet Centers: free individual and group counseling",
    detail: "Eligible service members, veterans and family members can get free readjustment counseling. You don't have to be enrolled in VA health care or receive disability compensation. To talk with a fellow combat veteran, call 877-927-8387, 24/7.",
    url: "https://www.va.gov/find-locations/?facilityType=vet_center",
    checked: VA_GUIDE_CHECKED,
    linkLabel: "Find a Vet Center",
  },
  {
    title: "Schedule and manage appointments",
    detail: "Once you're registered as a patient at a VA facility, you can schedule and cancel some appointments online. Options depend on your facility and the type of care.",
    url: "https://www.va.gov/health-care/schedule-view-va-appointments/",
    checked: VA_GUIDE_CHECKED,
    linkLabel: "Schedule VA appointments",
    stages: ["applied", "registered"],
  },
  {
    title: "Ask about Community Care if VA can't see you in time",
    detail: "If you're enrolled in or eligible for VA health care and VA can't give mental health care within a 30-minute average drive time or a 20-day wait, you may qualify for VA-paid care from a community provider.",
    url: "https://www.va.gov/resources/eligibility-for-community-care-outside-va/",
    checked: VA_GUIDE_CHECKED,
    linkLabel: "Community care eligibility",
  },
  {
    title: "Get free help from an accredited representative",
    detail: "An accredited Veterans Service Organization (VSO) representative, attorney or claims agent can help you file a claim or request a decision review.",
    url: "https://www.va.gov/get-help-from-accredited-representative/",
    checked: VA_GUIDE_CHECKED,
    linkLabel: "Find an accredited representative",
  },
];

export function showVaGuide(vaVsCommunity: string | null | undefined): boolean {
  return vaVsCommunity === "va" || vaVsCommunity === "both";
}

/** Where the veteran is in the VA process, from what they told us. Unknown = full guide. */
export function vaStageOf(applied: string | null | undefined, registered: string | null | undefined): VaStage | null {
  if (registered === "yes") return "registered";
  if (applied === "yes") return "applied";
  if (applied === "no") return "not_applied";
  return null;
}

export function guideFor(stage: VaStage | null, facilityUnknown = false): VaStep[] {
  if (!stage) return VA_GUIDE.filter((s) => !s.stages || s.stages.includes("not_applied"));
  const steps = VA_GUIDE.filter((s) => (s.stages ?? ALL).includes(stage));
  // Registered but unsure where: show how to find out, right after the crisis step.
  if (stage === "registered" && facilityUnknown) steps.splice(1, 0, FIND_FACILITY_STEP);
  return steps;
}

/** Shown only to registered patients who don't know which facility they're registered at. */
export const FIND_FACILITY_STEP: VaStep = {
  title: "Find out which VA facility you're registered at",
  detail: "Sign in on VA.gov and open your appointments, each visit lists its facility. Or call VA at 877-222-8387 (TTY: 711), Monday to Friday, 8:00 a.m. to 8:00 p.m. ET, and ask which facility you're registered with.",
  url: "https://www.va.gov/my-health/appointments",
  checked: VA_GUIDE_CHECKED,
  linkLabel: "Your VA appointments",
};

/** Official VA.gov ways to find out which facility you're registered at. */
export const FIND_MY_FACILITY = "Not sure which VA facility you're registered at? Call VA at 877-222-8387 (TTY: 711, Monday to Friday, 8:00 a.m. to 8:00 p.m. ET), or sign in on VA.gov and open your appointments (va.gov/my-health/appointments), which lists the facility for each visit.";
