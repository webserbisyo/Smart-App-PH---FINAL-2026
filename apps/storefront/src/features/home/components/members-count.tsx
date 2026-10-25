import { words } from '@smartapp/core';
import { Avatar, AvatarFallback, AvatarGroup } from '@smartapp/ui/components/avatar';

export interface MembersCountProps {
  count: number;
}

export function MembersCount({ count }: MembersCountProps) {
  if (count <= 0) return null;

  return (
    <div className="flex justify-center py-1">
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card p-1 pr-3 shadow-xs">
        <AvatarGroup>
          <Avatar size="sm" className="size-6 text-xs">
            <AvatarFallback className="bg-primary/10 font-medium text-primary">JD</AvatarFallback>
          </Avatar>
          <Avatar size="sm" className="size-6 text-xs">
            <AvatarFallback className="bg-secondary/40 font-medium text-secondary-foreground">
              MR
            </AvatarFallback>
          </Avatar>
          <Avatar size="sm" className="size-6 text-xs">
            <AvatarFallback className="bg-muted font-medium text-muted-foreground">
              SK
            </AvatarFallback>
          </Avatar>
        </AvatarGroup>

        <p className="text-xs font-medium text-muted-foreground">
          <span className="font-semibold text-foreground">
            {words.storefrontShell.home.membersCount(count)}
          </span>
        </p>
      </div>
    </div>
  );
}
