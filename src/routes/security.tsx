import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, CrisisBar } from "@/components/SiteHeader";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Data storage & security — VA Navigator" },
      { name: "description", content: "How VA Navigator stores your login, preferences and search history, and how that data is protected." },
      { property: "og:title", content: "Data storage & security — VA Navigator" },
      { property: "og:description", content: "Where VA Navigator keeps your data, who can see it, and the privacy controls you have." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Security,
});

const STORED: [string, string, string][] = [
  ["Login", "Secure sign-in system", "Your password is scrambled (hashed) before it's saved and is never stored as plain text."],
  ["Saved preferences", "Database, locked to your account", "Only you can read or change them."],
  ["Search history", "Database, locked to your account", "Only you can read it — admins can't. Skip it entirely with Private search."],
  ["Admin roles", "Separate protected list", "Can only be changed by an existing admin, and every change is logged."],
  ["Change log", "Database", "Written automatically. No one can edit or delete entries."],
  ["Care listings", "Database", "Public information from verified government sources, re-checked every Sunday."],
];

const card = "rounded-[22px] border-[3px] border-ink bg-paper p-5 shadow-hard-lg sm:rounded-[26px] sm:p-6";

function Security() {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="font-display text-3xl font-bold sm:text-5xl">Data storage & security</h1>
        <p className="mt-3 max-w-2xl text-ink/70">Here is what VA Navigator stores, where it's kept and how it's protected, in plain language.</p>

        <section className={`mt-8 ${card}`}>
          <h2 className="font-display text-2xl font-bold">Where your data lives</h2>
          <p className="mt-2 text-ink/80">VA Navigator runs on <strong>Lovable Cloud</strong>, a managed service built on <strong>Supabase</strong>, an open-source platform that uses a PostgreSQL database. The database, sign-in system and server code are hosted together, with automatic backups and security updates.</p>
        </section>

        <section className={`mt-6 ${card}`}>
          <h2 className="font-display text-2xl font-bold">What we store</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {STORED.map(([t, w, p]) => (
              <div key={t} className="rounded-2xl border-2 border-ink bg-cream p-4">
                <div className="font-bold">{t}</div>
                <div className="text-xs font-semibold uppercase tracking-wide text-ink/50">{w}</div>
                <p className="mt-1 text-sm text-ink/80">{p}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`mt-6 ${card}`}>
          <h2 className="font-display text-2xl font-bold">How it's protected</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-ink/80">
            <li><strong>Each person sees only their own data.</strong> Database rules (row-level security) check every request, so one account can never read another's searches or preferences.</li>
            <li><strong>Encryption.</strong> Everything travels over HTTPS and is encrypted while stored.</li>
            <li><strong>Hidden keys.</strong> Keys for AI services stay on the server and are never sent to your browser.</li>
            <li><strong>Separate admin roles.</strong> Admin access lives in its own protected list, and every grant or removal is recorded.</li>
            <li><strong>Change log no one can edit.</strong> Changes to data sources, AI settings and admins are recorded automatically with who made them and when.</li>
            <li><strong>Minimal sharing.</strong> When we look up providers in government directories, your name and account are never sent.</li>
            <li><strong>No selling.</strong> We never sell or share your information.</li>
          </ul>
        </section>

        <section className={`mt-6 ${card}`}>
          <h2 className="font-display text-2xl font-bold">Passwords and safe searching</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li><strong>Strong passwords.</strong> New accounts need 12+ characters with upper and lowercase letters, a number and a symbol. Passwords found in known data breaches are rejected.</li>
            <li><strong>Protected from SQL injection.</strong> Anything you type is always sent separately from database commands, so it can never run as one. Passwords are scrambled (hashed) and never placed in a query.</li>
          </ul>
        </section>

        <section className={`mt-6 ${card}`}>
          <h2 className="font-display text-2xl font-bold">Your privacy controls</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-ink/80">
            <li><strong>Private search:</strong> tick it under the chat and nothing gets saved to your history.</li>
            <li><strong>Clear all history:</strong> one button on <Link to="/history" className="underline">My search history</Link>.</li>
            <li><strong>Delete my account & all data:</strong> on <Link to="/account" className="underline">My account</Link>. This permanently erases your login, history and preferences.</li>
            <li>You can use the chat without an account at all.</li>
          </ul>
        </section>

        <p className="mt-6 text-sm text-ink/60">VA Navigator is a navigation tool, not a healthcare provider, and doesn't collect medical records. It was designed with HIPAA and NIST security principles in mind, but it isn't formally HIPAA-certified.</p>
      </main>
      <CrisisBar />
    </div>
  );
}
