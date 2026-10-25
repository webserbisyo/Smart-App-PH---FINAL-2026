import { IconStack } from '@smartapp/ui/components/reui/icon-stack';
import { Button } from '@smartapp/ui/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@smartapp/ui/components/empty';
import { ReceiptTextIcon, UtensilsIcon } from 'lucide-react';

export function Pattern() {
  return (
    <div className="flex items-center justify-center p-4">
      <Empty className="max-w-md py-10">
        <EmptyHeader>
          <EmptyMedia>
            <IconStack aria-hidden="true" className="h-24 w-22 text-primary">
              <ReceiptTextIcon className="size-5 text-primary" />
            </IconStack>
          </EmptyMedia>
          <EmptyTitle>No orders yet</EmptyTitle>
          <EmptyDescription>Your orders show here after you place one.</EmptyDescription>
        </EmptyHeader>

        <EmptyContent className="flex-row justify-center gap-2">
          <Button size="sm">
            <UtensilsIcon data-icon="inline-start" />
            See the menu
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
