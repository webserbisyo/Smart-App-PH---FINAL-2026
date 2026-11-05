import * as React from 'react';
import { SearchXIcon } from 'lucide-react';
import { errorWords, membersWords } from '@smartapp/core';
import { errorCodeOf, useFindMember } from '@smartapp/data';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Button } from '@smartapp/ui/components/button';
import { Spinner } from '@smartapp/ui/components/spinner';
import { PageEmpty } from '@/app/page-state';

const W = membersWords.find;

/**
 * /m/<code> (M13): the phone camera opens a member's or a prize's QR here. The code only opens the card
 * (D7); a stamp still needs the owner's tap.
 */
export function FindMemberScreen() {
  const { code } = useParams({ strict: false });
  const navigate = useNavigate();
  const find = useFindMember();
  const [failed, setFailed] = React.useState<string | null>(null);
  const started = React.useRef(false);

  React.useEffect(() => {
    if (started.current || !code) return;
    started.current = true;
    find
      .mutateAsync({ code })
      .then((found) =>
        navigate({ to: '/members', search: { member: found.customerId }, replace: true }),
      )
      .catch((err: unknown) => {
        const c = errorCodeOf(err);
        setFailed(c === 'not_found' ? W.notFound : errorWords(c));
      });
  }, [code, find, navigate]);

  if (failed) {
    return (
      <div className="p-4 md:p-6">
        <PageEmpty
          variant="box"
          icon={<SearchXIcon className="size-8 text-muted-foreground" />}
          title={failed}
          action={
            <Button variant="outline" className="h-11 md:h-9" render={<Link to="/members" />}>
              {W.back}
            </Button>
          }
        />
      </div>
    );
  }
  return (
    <div
      className="flex flex-1 items-center justify-center gap-2 p-8 text-muted-foreground"
      role="status"
    >
      <Spinner />
      {W.finding}
    </div>
  );
}
