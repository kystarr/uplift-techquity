import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Share2,
  Link as LinkIcon,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  MessageCircle,
  Instagram,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ShareBusinessMenuProps {
  businessId: string;
  businessName: string;
  /** Optional override for the canonical url. Defaults to current origin + /business/:id */
  url?: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  /** Render label next to the icon */
  showLabel?: boolean;
  /** Stop click propagation (useful when nested in Link cards) */
  stopPropagation?: boolean;
}

function buildCanonicalUrl(businessId: string, override?: string): string {
  if (override) return override;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/business/${businessId}`;
  }
  return `/business/${businessId}`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export const ShareBusinessMenu: React.FC<ShareBusinessMenuProps> = ({
  businessId,
  businessName,
  url,
  className,
  variant = "outline",
  size = "default",
  showLabel = true,
  stopPropagation = false,
}) => {
  const shareUrl = React.useMemo(
    () => buildCanonicalUrl(businessId, url),
    [businessId, url],
  );
  const encodedUrl = encodeURIComponent(shareUrl);
  const shareText = `Check out ${businessName} on Uplift`;
  const encodedText = encodeURIComponent(shareText);

  const handleStop = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
  };

  const handleCopy = async (message?: string) => {
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      toast.success(message ?? "Link copied to clipboard");
    } else {
      toast.error("Could not copy link", { description: shareUrl });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={handleStop}>
        <Button
          type="button"
          variant={variant}
          size={size}
          className={cn(className)}
          aria-label={`Share ${businessName}`}
        >
          <Share2 className="h-4 w-4" />
          {showLabel && "Share"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56"
        onClick={handleStop}
      >
        <DropdownMenuLabel>Share business</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void handleCopy()}>
          <LinkIcon className="h-4 w-4" />
          Copy link
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            openExternal(
              `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            )
          }
        >
          <Facebook className="h-4 w-4" />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            openExternal(
              `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
            )
          }
        >
          <Twitter className="h-4 w-4" />
          X (Twitter)
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            openExternal(
              `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
            )
          }
        >
          <Linkedin className="h-4 w-4" />
          LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            openExternal(
              `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
            )
          }
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            openExternal(
              `mailto:?subject=${encodeURIComponent(businessName)}&body=${encodedText}%20${encodedUrl}`,
            )
          }
        >
          <Mail className="h-4 w-4" />
          Email
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            void handleCopy(
              "Instagram has no web share — link copied. Paste it into your story, bio, or DM.",
            )
          }
        >
          <Instagram className="h-4 w-4" />
          Instagram (copy link)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ShareBusinessMenu;
