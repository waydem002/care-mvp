"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/dashboard", label: "Today" },
  { href: "/patients", label: "Patients" },
  { href: "/reminders", label: "Reminder schedule" },
  { href: "/staff", label: "Staff" },
  { href: "/schedule", label: "Schedule" },
  { href: "/tours", label: "Tours" },
  { href: "/requests", label: "Booking requests" },
  { href: "/insurance-calculator", label: "Insurance calculator" },
  { href: "/documents", label: "Documents" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col justify-between border-r border-border bg-brand text-white">
      <div>
        <div className="px-5 py-6">
          <p className="text-lg font-semibold leading-tight">Pflege Admin</p>
          <p className="text-sm text-white/60">Medication reminders</p>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="border-t border-white/10 px-5 py-4">
        <button
          onClick={handleSignOut}
          className="text-sm font-medium text-white/70 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
