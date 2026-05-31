import { NavLink } from "react-router-dom";
import { createPortal } from "react-dom";
import { useResidentApp } from "../../context/ResidentAppContext";

function IconPackage({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
    </svg>
  );
}

function IconPerson({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconBell({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function IconChat({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

const NAV_ITEMS = [
  { to: "/home", label: "Deliveries", badge: null, Icon: IconPackage },
  { to: "/visitors", label: "Visitors", badge: null, Icon: IconPerson },
  { to: "/notifications", label: "Alerts", badge: "notifications", Icon: IconBell },
  { to: "/chat", label: "Chat", badge: "chat", Icon: IconChat },
];

function MobileTabItem({ item, badgeValue }) {
  return (
    <NavLink
      to={item.to}
      className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2"
    >
      {({ isActive }) => (
        <>
          <span className={`flex h-9 w-9 items-center justify-center rounded-2xl transition-all duration-200 ${isActive ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "text-zinc-400"}`}>
            <item.Icon className="h-[18px] w-[18px]" />
          </span>
          <span className={`text-[10px] font-semibold tracking-wide transition-colors ${isActive ? "text-indigo-600" : "text-zinc-400"}`}>
            {item.label}
          </span>
          {badgeValue > 0 && (
            <span className="absolute right-[calc(50%-14px)] top-1.5 flex min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 py-0.5 text-[9px] font-bold leading-none text-white">
              {badgeValue > 9 ? "9+" : badgeValue}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export default function ResidentNav() {
  const { unreadChatCount, unreadNotificationsCount } = useResidentApp();

  function getBadge(item) {
    if (item.badge === "notifications") return unreadNotificationsCount;
    if (item.badge === "chat") return unreadChatCount;
    return 0;
  }

  const mobileNav = (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <div className="flex items-stretch">
        {NAV_ITEMS.map((item) => (
          <MobileTabItem key={item.to} item={item} badgeValue={getBadge(item)} />
        ))}
      </div>
    </nav>
  );

  return (
    <>
      <nav className="hidden items-center gap-1 md:flex">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                isActive ? "bg-indigo-600 text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`
            }
          >
            <item.Icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      {typeof document !== "undefined" ? createPortal(mobileNav, document.body) : null}
    </>
  );
}
