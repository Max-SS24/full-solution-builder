// Every step below was read and confirmed on the official VA.gov page it links to.
export const VA_GUIDE_CHECKED = "2026-10-28";

export type VaStep = { title: string; detail: string; url: string; linkLabel: string };

export const VA_GUIDE: VaStep[] = [
  {
    title: "If you're in crisis, get help now",
    detail: "Call 988 and select 1 (TTY: 711, then 988), call 911, or go directly to your nearest VA medical center. Discharge status and enrollment don't matter.",
    url: "https://www.va.gov/health-care/health-needs-conditions/mental-health/",
    linkLabel: "VA mental health care",
  },
  {
    title: "You can start mental health care before you enroll",
    detail: "Call or walk in to any VA medical center, any time, day or night, or any Vet Center during clinic hours. You can use some VA mental health services even if you're not enrolled in VA health care.",
    url: "https://www.va.gov/health-care/health-needs-conditions/mental-health/",
    linkLabel: "How to get mental health care",
  },
  {
    title: "Apply for VA health care (VA Form 10-10EZ)",
    detail: "Apply online, by phone at 877-222-8387 (Monday to Friday, 8:00 a.m. to 8:00 p.m. ET), by mail, or in person at your nearest VA medical center or clinic with a signed VA Form 10-10EZ.",
    url: "https://www.va.gov/health-care/how-to-apply/",
    linkLabel: "How to apply",
  },
  {
    title: "Find your nearest VA medical center or Vet Center",
    detail: "Use the VA facility locator, or call 877-222-8387 to find the right resources for your needs (TTY: 800-877-8339).",
    url: "https://www.va.gov/find-locations/",
    linkLabel: "Find VA locations",
  },
  {
    title: "Vet Centers: free individual and group counseling",
    detail: "Eligible service members, veterans and family members can get free readjustment counseling. You don't have to be enrolled in VA health care or receive disability compensation. To talk with a fellow combat veteran, call 877-927-8387, 24/7.",
    url: "https://www.va.gov/find-locations/?facilityType=vet_center",
    linkLabel: "Find a Vet Center",
  },
  {
    title: "Schedule and manage appointments",
    detail: "Once you're registered as a patient at a VA facility, you can schedule and cancel some appointments online. Options depend on your facility and the type of care.",
    url: "https://www.va.gov/health-care/schedule-view-va-appointments/",
    linkLabel: "Schedule VA appointments",
  },
  {
    title: "Ask about Community Care if VA can't see you in time",
    detail: "If you're enrolled in or eligible for VA health care and VA can't give mental health care within a 30-minute average drive time or a 20-day wait, you may qualify for VA-paid care from a community provider.",
    url: "https://www.va.gov/resources/eligibility-for-community-care-outside-va/",
    linkLabel: "Community care eligibility",
  },
  {
    title: "Get free help from an accredited representative",
    detail: "An accredited Veterans Service Organization (VSO) representative, attorney or claims agent can help you file a claim or request a decision review.",
    url: "https://www.va.gov/get-help-from-accredited-representative/",
    linkLabel: "Find an accredited representative",
  },
];

export function showVaGuide(vaVsCommunity: string | null | undefined): boolean {
  return vaVsCommunity === "va";
}
