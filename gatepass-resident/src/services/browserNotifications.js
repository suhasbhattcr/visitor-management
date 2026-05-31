export function getNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.requestPermission();
}

export function pushBrowserNotification(title, options = {}) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (Notification.permission !== "granted") {
    return;
  }

  const notification = new Notification(title, {
    body: options.body,
    tag: options.tag,
    icon: options.icon || "/favicon.svg",
    badge: options.badge || "/favicon.svg",
    requireInteraction: false,
  });

  setTimeout(() => notification.close(), 5000);
}
