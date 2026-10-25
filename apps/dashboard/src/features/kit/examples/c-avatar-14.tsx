import { Avatar, AvatarFallback } from '@smartapp/ui/components/avatar';

export function Pattern() {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="after:border-primary/10">
        <AvatarFallback className="bg-primary/10 text-primary">AB</AvatarFallback>
      </Avatar>
      <Avatar className="after:border-destructive/10">
        <AvatarFallback className="bg-destructive/10 text-destructive">DV</AvatarFallback>
      </Avatar>
      <Avatar className="after:border-success/20">
        <AvatarFallback className="bg-success-soft text-success-soft-foreground">SB</AvatarFallback>
      </Avatar>
      <Avatar className="after:border-member/20">
        <AvatarFallback className="bg-member-soft text-member-soft-foreground">DB</AvatarFallback>
      </Avatar>
    </div>
  );
}
