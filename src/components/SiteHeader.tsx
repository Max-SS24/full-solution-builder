import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu } from "lucide-react";
import { useAccount } from "@/hooks/useAccount";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const PILL = "shrink-0 rounded-full border-[3px] border-ink px-4 py-1.5 font-semibold hover:bg-soft";
const MENU_ITEM = "flex min-h-11 items-center rounded-2xl border-[3px] border-ink px-4 py-2 font-semibold hover:bg-soft";

function NavLinks({ item, onPick }: { item: string; onPick?: () => void }) {
  const { user, isAdmin } = useAccount();
  return (
    <>
      <Link to="/questionnaire" onClick={onPick} className={item}>Quick questions</Link>
      <Link to="/appointment-prep" onClick={onPick} className={item}>Appointment prep</Link>
      <Link to="/helpful-links" onClick={onPick} className={item}>Helpful links</Link>
      <Link to="/security" onClick={onPick} className={item}>Privacy & security</Link>
      {isAdmin && <Link to="/admin" onClick={onPick} className={`${item} bg-sun`}>Admin</Link>}
      {user && <Link to="/history" onClick={onPick} className={item}>History</Link>}
      {user
        ? <Link to="/account" onClick={onPick} className={item}>My account</Link>
        : <Link to="/auth" onClick={onPick} className={item}>Sign in</Link>}
    </>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="w-full max-w-full overflow-x-clip border-b-[3px] border-ink bg-cream">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-[3px] border-ink bg-sun font-display text-xl font-bold shadow-hard sm:h-11 sm:w-11 sm:rounded-2xl sm:text-2xl" aria-hidden="true">V</span>
          <div className="min-w-0">
            <div className="truncate font-display text-lg font-bold leading-none sm:text-xl">VA Navigator</div>
            <div className="hidden truncate text-[11px] font-medium uppercase tracking-[0.14em] text-ink/55 sm:block">Veteran mental-health navigator</div>
          </div>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-2 text-sm xl:flex">
          <a href="/#chat" className="shrink-0 rounded-full bg-navy px-5 py-2 font-semibold text-cream shadow-hard">Start a chat</a>
          <NavLinks item={PILL} />
        </nav>
        <div className="flex shrink-0 items-center gap-2 xl:hidden">
          <a href="/#chat" className="hidden min-h-11 items-center rounded-full bg-navy px-4 py-2 text-sm font-semibold text-cream shadow-hard min-[360px]:inline-flex">Start a chat</a>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="inline-flex min-h-11 items-center gap-2 rounded-full border-[3px] border-ink bg-paper px-4 text-sm font-semibold" aria-label="Open menu">
              <Menu className="h-4 w-4" aria-hidden="true" />Menu
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(20rem,100vw)] overflow-y-auto bg-paper text-ink">
              <SheetHeader><SheetTitle className="font-display text-2xl">Menu</SheetTitle></SheetHeader>
              <nav aria-label="Main" className="mt-4 grid gap-2 text-base">
                <a href="/#chat" onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-2xl bg-navy px-4 py-2 font-semibold text-cream shadow-hard">Start a chat</a>
                <NavLinks item={MENU_ITEM} onPick={() => setOpen(false)} />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function CrisisBar() {
  return (
    <aside aria-label="Crisis support" className="bg-coral text-paper">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-7 text-center sm:px-6 md:flex-row md:justify-between md:text-left">
        <div>
          <div className="font-display text-2xl font-bold">In a crisis right now?</div>
          <div className="text-sm text-paper/85">Veterans Crisis Line, reach a real person instantly, any hour.</div>
        </div>
        <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
          <a href="tel:988" className="rounded-full border-[3px] border-ink bg-paper px-5 py-3 text-center text-sm font-bold text-ink shadow-hard"><span aria-hidden="true">📞 </span>Dial 988, press 1</a>
          <a href="sms:838255" className="rounded-full border-[3px] border-ink bg-ink px-5 py-3 text-center text-sm font-bold text-paper">💬 Text 838255</a>
        </div>
      </div>
    </aside>
  );
}
