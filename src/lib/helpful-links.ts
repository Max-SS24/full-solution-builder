// Official VA.gov links shown on /helpful-links. Each `expect` string must appear
// on the live page for the weekly Sunday check to mark it verified.
export const LINKS_VERIFIED_ON = "2026-10-28";

export type HelpfulLink = { title: string; detail: string; url: string; expect: string; form?: string };

export const LOCATORS: HelpfulLink[] = [
  { title: "VA facility locator", detail: "Find VA medical centers and clinics near you, with hours, services and phone numbers.", url: "https://www.va.gov/find-locations/", expect: "Find VA Locations" },
  { title: "Vet Center locator", detail: "Free readjustment counseling for eligible veterans, service members and families.", url: "https://www.va.gov/find-locations/?facilityType=vet_center", expect: "Find VA Locations" },
  { title: "Community care provider locator", detail: "Find VA-approved community providers in your area.", url: "https://www.va.gov/find-locations/?facilityType=provider", expect: "Find VA Locations" },
  { title: "Find an accredited representative", detail: "Free help from a Veterans Service Organization rep, attorney or claims agent.", url: "https://www.va.gov/get-help-from-accredited-representative/find-rep/", expect: "accredited" },
];

export const FORMS: HelpfulLink[] = [
  { form: "VA Form 10-10EZ", title: "Apply for VA health care", detail: "Enroll in VA health care.", url: "https://www.va.gov/find-forms/about-form-10-10ez/", expect: "10-10ez" },
  { form: "VA Form 21-526EZ", title: "Apply for disability compensation", detail: "File a claim for service-connected disability.", url: "https://www.va.gov/find-forms/about-form-21-526ez/", expect: "21-526ez" },
  { form: "VA Form 10-3542", title: "Beneficiary travel claim", detail: "Get reimbursed for travel to VA health care.", url: "https://www.va.gov/find-forms/about-form-10-3542/", expect: "10-3542" },
  { form: "VA Form 21-22", title: "Appoint a VSO representative", detail: "Name a Veterans Service Organization to help with your claim.", url: "https://www.va.gov/find-forms/about-form-21-22/", expect: "21-22" },
  { form: "VA Form 20-0995", title: "Supplemental claim", detail: "Ask VA to review a decision with new evidence.", url: "https://www.va.gov/find-forms/about-form-20-0995/", expect: "20-0995" },
  { form: "VA Form 10-10CG", title: "Family caregiver program", detail: "Apply for the Program of Comprehensive Assistance for Family Caregivers.", url: "https://www.va.gov/find-forms/about-form-10-10cg/", expect: "10-10cg" },
  { title: "Search all VA forms", detail: "Look up any other VA form by name or number.", url: "https://www.va.gov/find-forms/", expect: "form" },
];

export const ALL_LINKS = [...LOCATORS, ...FORMS];

/** A link is verified only if the page loads (2xx) and still contains the expected text. */
export function isLinkCurrent(status: number, body: string, expect: string): boolean {
  return status >= 200 && status < 300 && body.toLowerCase().includes(expect.toLowerCase());
}
