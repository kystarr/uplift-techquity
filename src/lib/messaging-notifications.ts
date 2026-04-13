/** Ask the browser to show system notifications for new messages (user gesture recommended). */
export async function requestDesktopMessageNotifications(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") {
    return "denied";
  }
  return Notification.requestPermission();
}
