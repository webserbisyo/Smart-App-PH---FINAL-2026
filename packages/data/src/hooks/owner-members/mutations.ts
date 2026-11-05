import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type {
  AdjustStampsInput,
  ClaimCancelReason,
  MemberDetail,
  StampCardSettings,
  StampCardStatus,
} from '@smartapp/core';
import { useAdapters } from '../../adapters/index';
import { ownerMembersQk } from './qk';

/** The changed member goes straight into its cache; the list numbers refresh behind it. */
function memberChanged(qc: QueryClient, member: MemberDetail): void {
  qc.setQueryData(ownerMembersQk.member(member.id), member);
  void qc.invalidateQueries({ queryKey: ownerMembersQk.overview() });
  void qc.invalidateQueries({ queryKey: ownerMembersQk.lists() });
}

function cardChanged(qc: QueryClient, card: StampCardSettings): void {
  qc.setQueryData(ownerMembersQk.stampCard(), card);
  void qc.invalidateQueries({ queryKey: ownerMembersQk.all });
}

export function useGiveStamp() {
  const { ownerMembers } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { customerId: string; clientKey: string; confirmRecent: boolean }) =>
      ownerMembers.giveStamp(input),
    onSuccess: (change) => memberChanged(qc, change.member),
  });
}

export function useUndoChange() {
  const { ownerMembers } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { customerId: string; entryId: string }) => ownerMembers.undoChange(input),
    onSuccess: (member) => {
      memberChanged(qc, member);
      void qc.invalidateQueries({ queryKey: ownerMembersQk.claims() });
      void qc.invalidateQueries({ queryKey: ownerMembersQk.stampCard() });
    },
  });
}

export function useAdjustStamps() {
  const { ownerMembers } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AdjustStampsInput) => ownerMembers.adjustStamps(input),
    onSuccess: (member) => memberChanged(qc, member),
  });
}

export function useRewardAtCounter() {
  const { ownerMembers } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { customerId: string; clientKey: string }) => ownerMembers.useReward(input),
    onSuccess: (change) => {
      memberChanged(qc, change.member);
      void qc.invalidateQueries({ queryKey: ownerMembersQk.claims() });
      void qc.invalidateQueries({ queryKey: ownerMembersQk.stampCard() });
    },
  });
}

export function useSaveMemberNote() {
  const { ownerMembers } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { customerId: string; note: string | null }) =>
      ownerMembers.saveMemberNote(input),
    onSuccess: (member) => qc.setQueryData(ownerMembersQk.member(member.id), member),
  });
}

export function useFindMember() {
  const { ownerMembers } = useAdapters();
  return useMutation({ mutationFn: (input: { code: string }) => ownerMembers.findMember(input) });
}

function useClaimChange<I>(run: (input: I) => Promise<{ customerId: string }>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: (claim) => {
      void qc.invalidateQueries({ queryKey: ownerMembersQk.claims() });
      void qc.invalidateQueries({ queryKey: ownerMembersQk.member(claim.customerId) });
      void qc.invalidateQueries({ queryKey: ownerMembersQk.overview() });
      void qc.invalidateQueries({ queryKey: ownerMembersQk.lists() });
      void qc.invalidateQueries({ queryKey: ownerMembersQk.stampCard() });
    },
  });
}

export function useGiveClaim() {
  const { ownerMembers } = useAdapters();
  return useClaimChange((input: { claimId: string }) => ownerMembers.giveClaim(input));
}

export function useCancelClaim() {
  const { ownerMembers } = useAdapters();
  return useClaimChange((input: { claimId: string; reason: ClaimCancelReason }) =>
    ownerMembers.cancelClaim(input),
  );
}

export function useSaveStampCard() {
  const { ownerMembers } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StampCardSettings) => ownerMembers.saveStampCard(input),
    onSuccess: (card) => cardChanged(qc, card),
  });
}

export function useSetStampCardStatus() {
  const { ownerMembers } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { status: StampCardStatus }) => ownerMembers.setStampCardStatus(input),
    onSuccess: (card) => cardChanged(qc, card),
  });
}
