import { Link } from "@tanstack/react-router";
import { useAccount } from "@/hooks/useAccount";

export function SiteHeader() {
  const { user, isAdmin } = useAccount();
  return (
    <header className="border-b-[3px] border-ink bg-cream">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 sm:py-4 lg:flex lg:items-center lg:justify-between lg:gap-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-[3px] border-ink bg-sun font-display text-xl font-bold shadow-hard sm:h-11 sm:w-11 sm:rounded-2xl sm:text-2xl">V</span>
            <div className="min-w-0">
              <div className="truncate font-display text-lg font-bold leading-none sm:text-xl">VA Navigator</div>
              <div className="hidden text-[11px] font-medium uppercase tracking-[0.14em] text-ink/55 sm:block">Veteran mental-health navigator</div>
            </div>
          </Link>
          <a href="/#chat" className="shrink-0 rounded-full bg-navy px-4 py-2 text-sm font-semibold text-cream shadow-hard sm:px-5">Start a chat</a>
        </div>
        <nav className="mt-3 flex min-w-0 items-center gap-2 overflow-x-auto pb-1 text-sm lg:mt-0 lg:overflow-visible lg:pb-0">
          {isAdmin && (
            <Link to="/admin" className="shrink-0 rounded-full border-[3px] border-ink bg-sun px-4 py-1.5 font-semibold">Admin</Link>
          )}
          {user && (
            <Link to="/history" className="shrink-0 rounded-full border-[3px] border-ink px-4 py-1.5 font-semibold hover:bg-soft">History</Link>
          )}
          {user ? (
            <Link to="/account" className="shrink-0 rounded-full border-[3px] border-ink px-4 py-1.5 font-semibold hover:bg-soft">My account</Link>
          ) : (
            <Link to="/auth" className="shrink-0 rounded-full border-[3px] border-ink px-4 py-1.5 font-semibold hover:bg-soft">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function CrisisBar() {
  return (
    <section className="bg-coral text-paper">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-7 text-center sm:px-6 md:flex-row md:justify-between md:text-left">
        <div>
          <div className="font-display text-2xl font-bold">In a crisis right now?</div>
          <div className="text-sm text-paper/85">Veterans Crisis Line — reach a real person instantly, any hour.</div>
        </div>
        <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
          <a href="tel:988" className="rounded-full border-[3px] border-ink bg-paper px-5 py-3 text-center text-sm font-bold text-ink shadow-hard">📞 Dial 988 · press 1</a>
          <a href="sms:838255" className="rounded-full border-[3px] border-ink bg-ink px-5 py-3 text-center text-sm font-bold text-paper">💬 Text 838255</a>
        </div>
      </div>
    </section>
  );
}
