import { MEMBERS_PILL_MIN, membersPreviewAvatars, words } from '@smartapp/core';
import { Avatar, AvatarImage } from '@smartapp/ui/components/avatar';
import { AvatarGroup } from '@smartapp/ui/components/avatar-group';

// Members count with default faces (DiceUI avatar group, decision R11), never made-up initials. From
// 5 members up, and the real number at once (T77 part 7): a count-up from 0 read as "0 members".
export function MembersPill({ slug, count }: { slug: string; count: number }) {
  if (count < MEMBERS_PILL_MIN) return null;
  const faces = membersPreviewAvatars(slug, Math.min(count, 4));
  return (
    <div className="inline-flex items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-1 shadow-xs">
      <AvatarGroup size={28} max={4}>
        {faces.map((src) => (
          <Avatar key={src} className="size-7 ring-2 ring-card">
            <AvatarImage src={src} alt="" />
          </Avatar>
        ))}
      </AvatarGroup>
      <span className="text-sm font-semibold">
        <span className="sr-only">{words.storefrontShell.home.membersCount(count)}</span>
        <span aria-hidden="true">
          <span className="tabular-nums">{count.toLocaleString('en-PH')}</span>{' '}
          {words.storefrontShell.home.membersWord}
        </span>
      </span>
    </div>
  );
}
