// Appointment preparation facts. Every "finding" restates an official VA.gov page;
// "evidence" holds exact phrases from that page that must still be present before the
// fact is shown. Never AI-generated. Re-read the source page before editing any entry.
import type { VaStage } from "./va-guide";

export const PREP_DISCLAIMER =
  "All guidance here comes from official U.S. Department of Veterans Affairs documentation, linked beside each item. VA Navigator is not part of VA and is not responsible for any approval or denial of care, eligibility, referrals or payment. Only VA makes those decisions.";

export const PREP_UNCONFIRMED = "We couldn't confirm this is still current. See VA.gov directly:";

export const PREP_HOSTS = ["www.va.gov"];
export const PREP_CACHE_MS = 60 * 60 * 1000;

export type PrepTopic = "eligibility" | "referral" | "urgent";
export const PREP_TOPICS: Record<PrepTopic, string> = {
  eligibility: "Community care eligibility",
  referral: "Getting a community care referral",
  urgent: "In-network urgent care",
};

export type PrepFact = {
  id: string;
  topic: PrepTopic;
  finding: string;
  suggests: string;
  askProvider?: string;
  sourceUrl: string;
  sourceLabel: string;
  evidence: string[];
  stages?: VaStage[];
};

const ELIG = "https://www.va.gov/resources/eligibility-for-community-care-outside-va/";
const REF = "https://www.va.gov/resources/how-to-get-community-care-referrals-and-schedule-appointments/";
const URG = "https://www.va.gov/resources/getting-urgent-care-at-va-or-in-network-community-providers/";
const ELIG_L = "Eligibility for community care outside VA";
const REF_L = "How to get community care referrals and schedule appointments";
const URG_L = "Getting urgent care at VA or in-network community providers";

export const PREP_FACTS: PrepFact[] = [
  {
    id: "elig-basic",
    topic: "eligibility",
    finding: "VA lists two basic requirements for community care: you're enrolled in or eligible for VA health care, and you have approval from your VA health care team before you get care from a community provider (except in certain cases like urgent or emergency care).",
    suggests: "This suggests that approval from your VA health care team is the first step before booking with a community provider.",
    askProvider: "Can you review whether I meet the requirements for community care?",
    sourceUrl: ELIG, sourceLabel: ELIG_L,
    evidence: ["enrolled in or eligible for VA health care", "approval from your VA health care team"],
  },
  {
    id: "elig-access",
    topic: "eligibility",
    finding: "VA's designated access standards: for primary care, mental health and extended outpatient care, a 30-minute average drive time or 20-day wait time; for specialty care, a 60-minute average drive time or 28-day wait time.",
    suggests: "If your drive or the soonest VA appointment is longer than these standards, the data suggests you may want to ask whether you qualify for community care.",
    askProvider: "Does my average drive time or the soonest available appointment go beyond VA's access standards for the care I need?",
    sourceUrl: ELIG, sourceLabel: ELIG_L,
    evidence: ["30-minute average drive time or 20-day wait time", "60-minute average drive time or 28-day wait time"],
  },
  {
    id: "elig-other",
    topic: "eligibility",
    finding: "VA also lists other ways to qualify, including: a service VA doesn't provide, living in a state or territory without a full-service VA health facility, or you and your VA provider agreeing community care is in your best medical interest.",
    suggests: "This suggests it's worth raising your specific situation with your provider, even if drive and wait times are within the standards.",
    askProvider: "Would getting care from an in-network community provider be in my best medical interest?",
    sourceUrl: ELIG, sourceLabel: ELIG_L,
    evidence: ["full-service VA health facility", "best medical interest"],
  },
  {
    id: "elig-appeal",
    topic: "eligibility",
    finding: "If VA denies a request for care through community care, VA says you can appeal through its Clinical Appeals process.",
    suggests: "This suggests a denial is not necessarily final, and VA describes a review process for it.",
    sourceUrl: ELIG, sourceLabel: ELIG_L,
    evidence: ["Clinical Appeals process"],
  },
  {
    id: "ref-required",
    topic: "referral",
    finding: "VA states that before you schedule with a non-VA provider in its community care network, you must get a referral, and VA reviews the request, which can take up to 14 days.",
    suggests: "This suggests asking for a referral early, before trying to book a community appointment.",
    askProvider: "Can you request a community care referral for me, and to which provider?",
    sourceUrl: REF, sourceLabel: REF_L,
    evidence: ["you must get a referral", "can take up to 14 days"],
    stages: ["registered"],
  },
  {
    id: "ref-schedule",
    topic: "referral",
    finding: "After you have a referral you can schedule yourself or ask your VA health care team to. If you schedule yourself, VA asks you to tell your VA health care team within 14 days.",
    suggests: "If you book the appointment yourself, the data suggests letting your VA team know soon afterward.",
    sourceUrl: REF, sourceLabel: REF_L,
    evidence: ["tell your VA health care team within 14 days"],
    stages: ["registered"],
  },
  {
    id: "ref-letter",
    topic: "referral",
    finding: "VA sends an authorization letter after you schedule. VA describes it as your approval for community care, with an authorization number, your approved provider, the care you can get, and how long you can get care without another referral.",
    suggests: "This suggests keeping the letter handy and checking that the visit matches what it covers, since VA says it won't cover services the letter doesn't include.",
    askProvider: "How many visits does my authorization cover, and for how long?",
    sourceUrl: REF, sourceLabel: REF_L,
    evidence: ["authorization letter", "authorization number"],
    stages: ["registered"],
  },
  {
    id: "ref-bring",
    topic: "referral",
    finding: "VA shares your medical records with the community provider, but asks you to bring copies of any images (like CT scans or MRIs) the provider asks for.",
    suggests: "This suggests asking the community office ahead of time whether they want any scans brought in.",
    sourceUrl: REF, sourceLabel: REF_L,
    evidence: ["bring copies of any images"],
    stages: ["registered"],
  },
  {
    id: "urg-eligible",
    topic: "urgent",
    finding: "VA says you can get urgent care at VA medical centers and in-network community providers if you're enrolled in VA health care and received care at a VA or in-network provider in the past 24 months. No referral is needed.",
    suggests: "If both apply to you, this suggests urgent care for minor illnesses or injuries doesn't need to wait for a referral.",
    sourceUrl: URG, sourceLabel: URG_L,
    evidence: ["in the past 24 months", "You don’t need to get a referral"],
  },
  {
    id: "urg-bring",
    topic: "urgent",
    finding: "VA lists what to bring to a community urgent care provider: a valid government-issued photo ID and a copy of the VA urgent care billing information card. VA says to confirm the provider is in network, and not to pay a copay at the visit.",
    suggests: "This suggests checking that the clinic is in VA's network before you're seen, since VA says it can't pay out-of-network claims.",
    sourceUrl: URG, sourceLabel: URG_L,
    evidence: ["government-issued photo ID", "urgent care billing information card", "Don’t pay a copay"],
  },
  {
    id: "urg-emergency",
    topic: "urgent",
    finding: "VA says that if you think your life or health is in danger, call 911 or go to the nearest emergency room.",
    suggests: "Urgent care is described for minor, non-life-threatening problems only.",
    sourceUrl: URG, sourceLabel: URG_L,
    evidence: ["call", "911", "nearest emergency room"],
  },
];

export function isPrepUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && PREP_HOSTS.includes(u.hostname);
  } catch { return false; }
}

/** Collapse markup, entities and whitespace so evidence phrases match page text. */
export function pageText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ").replace(/&rsquo;|&#8217;|&#x2019;/g, "’").replace(/&amp;/g, "&")
    .replace(/[\u00a0\u2011]/g, (c) => (c === "\u2011" ? "-" : " "))
    .replace(/\s+/g, " ").toLowerCase();
}

export function factStillValid(fact: PrepFact, status: number, text: string): boolean {
  if (status < 200 || status >= 300) return false;
  const norm = (s: string) => s.replace(/['‘’]/g, "’").toLowerCase();
  const t = norm(text);
  return fact.evidence.every((e) => t.includes(norm(e)));
}

export function factsFor(stage: VaStage | null): PrepFact[] {
  return PREP_FACTS.filter((f) => !f.stages || (stage !== null && f.stages.includes(stage)));
}

export type PrepCheck = { id: string; ok: boolean; checkedAt: string };
export type PrepView = { fact: PrepFact; verified: true; checkedAt: string } | { fact: PrepFact; verified: false };

/** Only facts with a passing check are marked verified; anything else is withheld. */
export function applyChecks(facts: PrepFact[], checks: PrepCheck[]): PrepView[] {
  const byId = new Map(checks.map((c) => [c.id, c]));
  return facts.map((fact) => {
    const c = byId.get(fact.id);
    return c?.ok ? { fact, verified: true, checkedAt: c.checkedAt } : { fact, verified: false };
  });
}
