import { useCallback, useState } from 'react';
import { errorWords, membersWords, UNDO_SECONDS, type MemberDetail } from '@smartapp/core';
import {
  errorCodeOf,
  ownerMembersQk,
  useAdapters,
  useGiveStamp,
  useQueryClient,
  useRewardAtCounter,
  useUndoChange,
} from '@smartapp/data';
import { closeToast, notify } from '@smartapp/ui/compositions/notify';

export interface RecentAsk {
  customerId: string;
  name: string;
  at: string | null;
}

function newKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * The counter actions (T58, T59): one tap stamps with a 10 s Undo, a second tap within 2 minutes asks
 * first, and Use reward takes the stamps off with the same Undo. Each tap carries its own key (D2).
 */
export function useCounterActions() {
  const give = useGiveStamp();
  const use = useRewardAtCounter();
  const undo = useUndoChange();
  const qc = useQueryClient();
  const { ownerMembers } = useAdapters();
  const [recent, setRecent] = useState<RecentAsk | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const offerUndo = useCallback(
    (title: string, customerId: string, entryId: string, undoneTitle: string) => {
      let used = false;
      const id = notify({
        title,
        tone: 'success',
        durationMs: UNDO_SECONDS * 1000,
        action: {
          label: membersWords.toast.undo,
          onClick: () => {
            if (used) return;
            used = true;
            closeToast(id);
            undo
              .mutateAsync({ customerId, entryId })
              .then(() => notify({ title: undoneTitle, tone: 'info' }))
              .catch((err: unknown) =>
                notify({ title: errorWords(errorCodeOf(err)), tone: 'error' }),
              );
          },
        },
      });
    },
    [undo],
  );

  const stamp = useCallback(
    async (member: { id: string; name: string }, confirmRecent = false): Promise<void> => {
      setBusyId(member.id);
      try {
        const change = await give.mutateAsync({
          customerId: member.id,
          clientKey: newKey(),
          confirmRecent,
        });
        setRecent(null);
        offerUndo(
          membersWords.toast.stamped(change.member.balance, change.member.goal),
          member.id,
          change.entryId,
          membersWords.toast.stampUndone,
        );
      } catch (err) {
        const code = errorCodeOf(err);
        if (code === 'stamp_recent') {
          // Ask with the time of the last tap; the member's card is usually loaded already.
          const cached = qc.getQueryData<MemberDetail>(ownerMembersQk.member(member.id));
          const detail =
            cached ?? (await ownerMembers.getMember({ customerId: member.id }).catch(() => null));
          setRecent({
            customerId: member.id,
            name: member.name,
            at: detail?.lastCounterStampAt ?? null,
          });
        } else {
          notify({ title: errorWords(code), tone: 'error' });
        }
      } finally {
        setBusyId(null);
      }
    },
    [give, offerUndo, qc, ownerMembers],
  );

  const redeem = useCallback(
    async (member: { id: string }, prize: boolean): Promise<void> => {
      setBusyId(member.id);
      try {
        const change = await use.mutateAsync({ customerId: member.id, clientKey: newKey() });
        offerUndo(
          prize ? membersWords.toast.prizeGiven : membersWords.toast.rewardUsed,
          member.id,
          change.entryId,
          membersWords.toast.rewardUndone,
        );
      } catch (err) {
        notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
      } finally {
        setBusyId(null);
      }
    },
    [use, offerUndo],
  );

  return { stamp, redeem, recent, closeRecent: () => setRecent(null), busyId };
}
