import React from "react";
import { Bell, Trash2, X } from "lucide-react";
import { useNotificationStore } from "../store/notificationStore";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = React.useState(false);
  const {
    notifications,
    clearAllNotifications,
    fetchNotifications,
    deleteNotification,
  } = useNotificationStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Fetch notifications on component mount, when user changes, and when fetchNotifications changes
  React.useEffect(() => {
    const fetchData = async () => {
      if (user?.uid) {
        try {
          await fetchNotifications();
        } catch (error) {
          console.error("Error fetching notifications:", error);
        }
      }
    };

    fetchData();
  }, [user?.uid, fetchNotifications]);

  const handleClearNotifications = async () => {
    if (user) {
      await clearAllNotifications(user.uid);
      localStorage.removeItem("notifications");
      setIsOpen(false);
    }
  };

  const handleNotificationClick = async (
    notificationId: string,
    url: string
  ) => {
    navigate(url);
    setIsOpen(false);
    // Remove the notification after clicking
    await deleteNotification(notificationId);
  };

  const formatTimestamp = (date: Date) => {
    if (!date) return "Just now";

    // Ensure we have a Date object
    const dateObj = date instanceof Date ? date : new Date(date);

    const now = new Date();
    const diff = now.getTime() - dateObj.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  const formatContent = (content: string) => {
    // Replace **text** with bold spans
    return content.split(/(\*\*.*?\*\*)/).map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        // Remove ** and wrap in bold span
        return (
          <span key={index} className="font-bold">
            {part.slice(2, -2)}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full"
        >
          <Bell className="size-6 text-muted-foreground" />
          {notifications.length > 0 && (
            <Badge className="absolute top-0 right-0 h-4 min-w-4 bg-red-500 px-1 text-xs font-bold text-white">
              {notifications.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-96 p-0">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-muted/50">
          <div>
            <h3 className="font-semibold text-lg text-foreground">
              Notifications
            </h3>
            <p className="text-sm text-muted-foreground">
              {notifications.length} unread messages
            </p>
          </div>
          <div className="flex gap-2">
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-muted-foreground hover:text-destructive"
                onClick={handleClearNotifications}
                title="Clear all notifications"
              >
                <Trash2 className="size-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-muted-foreground"
              onClick={() => setIsOpen(false)}
            >
              <X className="size-5" />
            </Button>
          </div>
        </div>

        {/* Notification List */}
        <div className="overflow-y-auto max-h-[60vh]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Bell className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground text-center">
                No new notifications
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 hover:bg-muted/50 cursor-pointer transition-colors duration-200"
                  onClick={() =>
                    handleNotificationClick(notification.id, notification.url)
                  }
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-foreground">
                        {formatContent(notification.content)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTimestamp(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
