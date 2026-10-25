import { Button } from '@smartapp/ui/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@smartapp/ui/components/empty';
import { ArrowUpRightIcon } from 'lucide-react';

export function Pattern() {
  return (
    <div className="flex items-center justify-center">
      <Empty className="bg-muted">
        <EmptyHeader>
          <EmptyTitle>No results found</EmptyTitle>
          <EmptyDescription>
            No results found for your search. Try adjusting your search terms.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button>Try again</Button>
          <Button
            variant="link"
            render={<a href="#" />}
            className="text-muted-foreground"
            nativeButton={false}
          >
            Learn more <ArrowUpRightIcon />
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
