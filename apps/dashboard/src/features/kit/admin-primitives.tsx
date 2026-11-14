import { BillingMessageSchema, PlanPaymentSchema, type BillingMessage } from '@smartapp/core';
import { BillingComposer, BillingThread } from '@/app/billing-thread';
import { KitSection } from './kit-section.js';

// Sample lines for the kit only, parsed through the same schemas as the API.
const PAYMENT = PlanPaymentSchema.parse({
  id: 'kit-pay-1',
  months: 6,
  amount: 199_500,
  method: 'gcash',
  reference: '2503287008032',
  status: 'approved',
  submittedAt: '2026-11-10T02:30:00.000Z',
  coversUntil: '2027-05-10',
});

const THREAD: BillingMessage[] = [
  {
    id: 'kit-b1',
    at: '2026-11-07T00:48:00.000Z',
    from: 'system',
    kind: 'live',
    paymentId: null,
    text: null,
    reason: null,
    days: null,
  },
  {
    id: 'kit-b2',
    at: '2026-11-10T02:30:00.000Z',
    from: 'owner',
    kind: 'payment',
    paymentId: 'kit-pay-1',
    text: null,
    reason: null,
    days: null,
  },
  {
    id: 'kit-b3',
    at: '2026-11-10T03:05:00.000Z',
    from: 'admin',
    kind: 'approved',
    paymentId: 'kit-pay-1',
    text: null,
    reason: null,
    days: null,
  },
  {
    id: 'kit-b4',
    at: '2026-11-10T03:06:00.000Z',
    from: 'admin',
    kind: 'note',
    paymentId: null,
    text: 'Salamat! Your 1 free month is in.',
    reason: null,
    days: null,
  },
].map((line) => BillingMessageSchema.parse(line));

/** Super Admin and owner Plan pieces (T88): the Billing chat built from the installed chat parts. */
export function AdminPrimitiveSections() {
  return (
    <KitSection
      title="Billing chat"
      library="composition (Message, Bubble, Attachment, Marker)"
      path="apps/dashboard/src/app/billing-thread.tsx"
      usedIn="Settings Plan (owner), Super Admin shop panel Billing tab (T88)"
    >
      <div className="grid max-w-3xl gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground">Owner sees</p>
          <BillingThread
            thread={THREAD}
            payments={[PAYMENT]}
            viewer="owner"
            ownerName="Rosa Bautista"
          />
          <BillingComposer onSend={() => Promise.resolve()} />
        </div>
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground">Super Admin sees</p>
          <BillingThread
            thread={THREAD}
            payments={[PAYMENT]}
            viewer="admin"
            ownerName="Rosa Bautista"
          />
        </div>
      </div>
    </KitSection>
  );
}
