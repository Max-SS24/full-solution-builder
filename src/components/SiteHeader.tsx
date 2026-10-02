import { Link } from "@tanstack/react-router";
import { useAccount } from "@/hooks/useAccount";

export function SiteHeader() {
  const { user, isAdmin } = useAccount();
  return (
    <header className="border-b-[3px] border-ink bg-cream">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border-[3px] border-ink bg-sun font-display text-2xl font-bold shadow-hard">V</span>
          <div>
            <div className="font-display text-xl font-bold leading-none">VA Navigator</div>
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/55">Veteran mental-health navigator</div>
          </div>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <a href="/#chat" className="rounded-full bg-navy px-5 py-2 font-semibold text-cream shadow-hard">Start a chat</a>
          {isAdmin && (
            <Link to="/admin" className="rounded-full border-[3px] border-ink bg-sun px-4 py-1.5 font-semibold">Admin</Link>
          )}
          {user && (
            <Link to="/history" className="rounded-full border-[3px] border-ink px-4 py-1.5 font-semibold hover:bg-soft">History</Link>
          )}
          {user ? (
            <Link to="/account" className="rounded-full border-[3px] border-ink px-4 py-1.5 font-semibold hover:bg-soft">My account</Link>
          ) : (
            <Link to="/auth" className="rounded-full border-[3px] border-ink px-4 py-1.5 font-semibold hover:bg-soft">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function CrisisBar() {
  return (
    <section className="bg-coral text-paper">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <div className="font-display text-2xl font-bold">In a crisis right now?</div>
          <div className="text-sm text-paper/85">Veterans Crisis Line — reach a real person instantly, any hour.</div>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <a href="tel:988" className="rounded-full border-[3px] border-ink bg-paper px-5 py-3 text-sm font-bold text-ink shadow-hard">📞 Dial 988 · press 1</a>
          <a href="sms:838255" className="rounded-full border-[3px] border-ink bg-ink px-5 py-3 text-sm font-bold text-paper">💬 Text 838255</a>
        </div>
      </div>
    </section>
  );
}
