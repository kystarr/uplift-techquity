import { MoreVertical, Bell, BellOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  /** When false, the trigger is not rendered (e.g. draft thread). */
  openable: boolean;
  participantMuted: boolean;
  onToggleMute: () => void | Promise<void>;
  onRequestDelete: () => void;
  muteBusy?: boolean;
};

export function ConversationChatMenu({
  openable,
  participantMuted,
  onToggleMute,
  onRequestDelete,
  muteBusy,
}: Props) {
  if (!openable) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground"
          aria-label="Chat options"
        >
          <MoreVertical className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem disabled={muteBusy} onSelect={() => void Promise.resolve(onToggleMute())}>
          {participantMuted ? (
            <>
              <Bell className="mr-2 h-4 w-4" />
              Unmute conversation
            </>
          ) : (
            <>
              <BellOff className="mr-2 h-4 w-4" />
              Mute conversation
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onRequestDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
