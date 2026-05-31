import { NavLink } from "react-router-dom";
import { createPortal } from "react-dom";
import { useSecurityApp } from "../../context/SecurityAppContext";

const NAV_ITEMS = [
  { to: "/home", label: "Home", icon: "HM" },
  { to: "/notifications", label: "Alerts", badge: "notifications", icon: "AL" },
  { to: "/chat", label: "Chat", badge: "chat", icon: "CH" },
  { to: "/create", label: "Create", icon: "CR" },
  { to: "/live", label: "Live", icon: "LV" },
];

function NavButton({ item, unreadChatCount, unreadNotificationsCount, mobile = false }) {
  const badgeValue = item.badge === "chat"
    ? unreadChatCount
    : (item.badge === "notifications" ? unreadNotificationsCount : 0);

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) => {
        if (mobile) {
          return `relative flex-1 rounded-2xl px-1 py-1.5 text-center text-[10px] font-semibold transition-transform duration-150 active:scale-[0.98] ${
            isActive ? "bg-zinc-900 text-white" : "text-zinc-700"
          }`;
        }

        return `relative rounded-xl px-4 py-2 text-sm font-semibold ${
          isActive ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
        }`;
      }}
    >
      {mobile ? (
        <span className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] font-bold tracking-wider">{item.icon}</span>
          <span>{item.label}</span>
        </span>
      ) : item.label}
      {badgeValue > 0 && (
        <span className="absolute right-2 top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-4 text-white">
          {badgeValue > 9 ? "9+" : badgeValue}
        </span>
      )}
    </NavLink>
  );
}

export default function SecurityNav() {
  const { unreadChatCount, unreadNotificationsCount } = useSecurityApp();

  const mobileNav = (
    <nav className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 md:hidden">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-1 rounded-3xl border border-zinc-200 bg-white/96 p-1.5 shadow-xl backdrop-blur">
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.to}
            item={item}
            unreadChatCount={unreadChatCount}
            unreadNotificationsCount={unreadNotificationsCount}
            mobile
          />
        ))}
      </div>
    </nav>
  );

  return (
    <>
      <nav className="hidden items-center gap-2 md:flex">
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.to}
            item={item}
            unreadChatCount={unreadChatCount}
            unreadNotificationsCount={unreadNotificationsCount}
          />
        ))}
      </nav>

      {typeof document !== "undefined" ? createPortal(mobileNav, document.body) : null}
    </>
  );
}
