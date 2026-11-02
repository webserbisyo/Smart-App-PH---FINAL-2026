import { PlusIcon } from 'lucide-react';
import { Button } from '@smartapp/ui/components/button';

// The phone's Add button on every Menu tab: a pill above the dock (finding C1). Desktop shows the
// same action as a toolbar button instead. Lists keep bottom space so it never covers the last row.
export function FloatingAddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 above-dock z-30 flex justify-end px-4 md:hidden">
      <Button
        type="button"
        className="pointer-events-auto h-12 gap-2 rounded-full px-5 font-semibold shadow-lg"
        onClick={onClick}
      >
        <PlusIcon className="size-5" />
        {label}
      </Button>
    </div>
  );
}
