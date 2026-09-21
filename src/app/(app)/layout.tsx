"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Basket,
  Users as UsersIcon,
  ChartBar,
  CheckSquare,
  Gear,
  SignOut,
  DotOutline,
  List,
  X,
  FileCsv,
  Buildings,
  DotsThree,
} from "@phosphor-icons/react";
import {
  getAppSettings,
  syncSettingsFromSheets,
} from "@/services/settingsService";
import { syncStaging } from "@/services/sheetsService";
import { isManagerRole } from "@/services/adminService";
import { clearSessionUser } from "@/utils/session";
import { Toaster } from "@/components/ui/sonner";
import { SettingsProvider } from "@/lib/SettingsProvider";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { ReactNode } from "react";

interface User {
  username: string;
  display_name?: string;
  role: string;
}

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/app", icon: Basket, label: "Input Order" },
  { href: "/app/customers", icon: UsersIcon, label: "Customer" },
  { href: "/app/dashboard", icon: ChartBar, label: "Dashboard" },
  { href: "/app/follow-up", icon: CheckSquare, label: "Follow-up" },
  { href: "/app/admin", icon: Buildings, label: "Admin", adminOnly: true },
  { href: "/app/settings", icon: Gear, label: "Settings" },
  { href: "/app/export", icon: FileCsv, label: "Export Data CSV", adminOnly: true },
];

function visibleNav(user: User | null): NavItem[] {
  return user
    ? NAV_ITEMS.filter((i) => !i.adminOnly || isManagerRole(user.role))
    : NAV_ITEMS;
}

function NavLink({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm transition-all duration-300 active:scale-[0.98] ${
        isActive
          ? "bg-white font-semibold text-[#022D4E] shadow-[0_2px_8px_-4px_rgba(28,43,66,0.4)] ring-1 ring-hairline"
          : "text-ash hover:bg-sunken hover:text-ink"
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full  bg-[#022D4E]" />
      )}
      <Icon
        size={20}
        weight={isActive ? "fill" : "regular"}
        className={isActive ? "text-[#022D4E]" : ""}
      />
      <span>{label}</span>
    </Link>
  );
}

function Sidebar({
  user,
  storeName,
  onLogout,
}: {
  user: User | null;
  storeName: string;
  onLogout: () => void;
}) {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col p-4 md:flex">
      <div className="doppel-outer flex-1 rounded-[2rem]">
        <div className="doppel-inner flex h-full flex-col justify-between rounded-[calc(2rem-0.375rem)]">
          <div className="flex flex-col gap-6 p-5">
            <div className="flex items-center gap-3">
              <Image
                src="/brand-assets/mycustomer-icon.png"
                alt="MYCUSTOMER Icon"
                width={40}
                height={40}
                className="h-10 w-10 object-contain drop-shadow-sm"
                priority
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">
                  {storeName}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <DotOutline
                    size={14}
                    weight="fill"
                    className="text-emerald"
                  />
                  <span className="text-xs font-semibold text-emerald">
                    Online
                  </span>
                </div>
              </div>
            </div>

            <nav className="flex flex-col gap-1">
              {visibleNav(user).map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </nav>
          </div>

          <div className="border-t border-hairline p-5">
            {user && (
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full  bg-[#022D4E]-wash text-xs font-semibold text-[#022D4E]-deep">
                    {(user.display_name || user.username).slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-ink">
                    {user.display_name || user.username}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  aria-label="Keluar dari aplikasi"
                  className="flex h-11 w-11 items-center justify-center rounded-md border border-hairline text-ash transition-colors duration-300 hover:bg-sunken hover:text-ink"
                  title="Keluar dari aplikasi"
                >
                  <SignOut size={16} weight="bold" />
                </button>
              </div>
            )}
            <div className="text-xs text-mist">MYCUSTOMER v2.5</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function BottomNav({
  user,
  onLogout,
}: {
  user: User | null;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const primaryItems = NAV_ITEMS.slice(0, 4);
  const secondaryItems = visibleNav(user).filter(
    (item) => !primaryItems.some((primary) => primary.href === item.href),
  );

  return (
    <nav className="fixed inset-x-4 bottom-4 z-50 md:hidden">
      <div className="doppel-outer rounded-[1.75rem]">
        <div className="doppel-inner flex h-16 items-center justify-around rounded-[calc(1.75rem-0.375rem)] px-2">
          {primaryItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-md py-1.5 transition-all duration-300 active:scale-[0.95] ${
                  isActive ? "text-white" : "text-mist"
                }`}
              >
                <span
                  className={`flex h-8 w-12 items-center justify-center rounded-full ${isActive ? " bg-[#022D4E]" : ""}`}
                >
                  <item.icon
                    size={22}
                    weight={isActive ? "fill" : "regular"}
                    className={isActive ? "text-white" : "text-mist"}
                  />
                </span>
                <span
                  className={`text-[11px] font-medium ${isActive ? "text-[#022D4E]" : "text-ash"}`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
          <Sheet>
            <SheetTrigger
              aria-label="Buka menu lainnya"
              className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-md py-1.5 text-ash transition-all duration-300 active:scale-[0.95]"
            >
              <DotsThree size={22} weight="bold" />
              <span className="text-[11px] font-medium text-ash">Lainnya</span>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[1.75rem] px-5 pb-8">
              <SheetHeader className="text-left">
                <SheetTitle>Menu lainnya</SheetTitle>
                <SheetDescription>Akses fitur tambahan dan pengaturan akun.</SheetDescription>
              </SheetHeader>
              <div className="mt-5 space-y-2">
                {secondaryItems.map((item) => (
                  <NavLink key={item.href} {...item} />
                ))}
                <button
                  onClick={onLogout}
                  className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold text-ink hover:bg-rose/10"
                >
                  <SignOut size={20} weight="bold" />
                  <span>Keluar</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [storeName, setStoreName] = useState("Cabang Senopati");
  const [menuOpen, setMenuOpen] = useState(false);

  const syncSettings = () => {
    const s = getAppSettings();
    setStoreName(s.storeName);
  };

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unauthorized");
        return response.json();
      })
      .then(({ user: authenticatedUser }) => {
        if (!active) return;
        setUser(authenticatedUser);
        syncSettings();
        syncSettingsFromSheets()
          .then((s) => setStoreName(s.storeName))
          .catch(() => {});
        syncStaging().catch(() => {});
      })
      .catch(() => router.replace("/login"));

    const handleSettingsEvent = () => syncSettings();
    window.addEventListener("mycustomer_settings_changed", handleSettingsEvent);
    return () => {
      active = false;
      window.removeEventListener(
        "mycustomer_settings_changed",
        handleSettingsEvent,
      );
    };
  }, [router]);

  const handleLogout = () => {
    clearSessionUser();
    void fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  return (
    <SettingsProvider>
      <div className="sky-hero grain relative min-h-[100dvh] md:pl-64">
        <Toaster position="top-center" />
        {/* Top Navbar Header with Hamburg Menu */}
        <header className="sticky top-0 z-40 border-b border-hairline bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Image
                src="/brand-assets/mycustomer-icon.png"
                alt="MYCUSTOMER Icon"
                width={32}
                height={32}
                className="h-8 w-8 object-contain md:hidden drop-shadow-sm"
              />
              <div>
                <span className="text-sm font-semibold text-ink">
                  {storeName}
                </span>
                <div className="flex items-center gap-1">
                  <DotOutline
                    size={12}
                    weight="fill"
                    className="text-emerald"
                  />
                  <span className="text-[10px] font-semibold text-emerald">
                    Online
                  </span>
                </div>
              </div>
            </div>

            {/* Hamburg Menu Button */}
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation-menu"
              aria-label={menuOpen ? "Tutup menu utama" : "Buka menu utama"}
              className="flex h-11 w-11 items-center justify-center rounded-md border border-hairline bg-white text-ink transition-all hover:bg-sunken active:scale-95"
              title={menuOpen ? "Tutup menu utama" : "Buka menu utama"}
            >
              {menuOpen ? (
                <X size={20} weight="bold" />
              ) : (
                <List size={22} weight="bold" />
              )}
            </button>
          </div>
        </header>

        {/* Hamburg Menu Overlay Drawer */}
        <AnimatePresence>
          {menuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-50 bg-ink/20 backdrop-blur-sm"
              />

              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                id="mobile-navigation-menu"
                className="fixed top-16 right-4 z-50 w-72 overflow-hidden"
              >
                <div className="doppel-outer">
                  <div className="doppel-inner p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-hairline pb-3 px-1">
                      <div>
                        <div className="text-sm font-semibold text-ink">
                          {storeName}
                        </div>
                        <div className="text-xs text-ash">
                          {user?.display_name || user?.username} ({user?.role || "Kasir"})
                        </div>
                      </div>
                      <button
                        onClick={() => setMenuOpen(false)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-ash hover:bg-sunken hover:text-ink"
                      >
                        <X size={16} weight="bold" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      {visibleNav(user).map((item) => (
                        <NavLink
                          key={item.href}
                          {...item}
                          onClick={() => setMenuOpen(false)}
                        />
                      ))}
                    </div>

                    <div className="border-t border-hairline pt-3">
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          handleLogout();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-2 text-xs font-semibold text-ink hover:bg-rose/10 transition-colors"
                      >
                        <SignOut size={16} weight="bold" />
                        <span>Keluar (Logout)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <Sidebar user={user} storeName={storeName} onLogout={handleLogout} />
        <main className="relative pb-28 md:pb-10">{children}</main>
        <BottomNav user={user} onLogout={handleLogout} />
      </div>
    </SettingsProvider>
  );
}
