import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@smartapp/ui/components/reui/alert';
import { Frame, FramePanel } from '@smartapp/ui/components/reui/frame';

import { Button } from '@smartapp/ui/components/button';
import { LightbulbIcon, XIcon } from 'lucide-react';

export function Pattern() {
  return (
    <div className="mx-auto mb-auto w-full max-w-lg">
      <Frame variant="ghost">
        <FramePanel className="overflow-hidden p-0!">
          <Alert variant="info" className="border-0 shadow-none">
            <LightbulbIcon />
            <AlertTitle>New: Advanced Analytics</AlertTitle>
            <AlertAction>
              <Button
                size="xs"
                variant="ghost"
                className="-mt-1 -mr-2 size-7 p-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
              >
                <XIcon className="size-3.5" />
              </Button>
            </AlertAction>
            <AlertDescription>
              We&apos;ve just released a new dashboard for tracking your team&apos;s performance.
              <Button variant="link" size="sm" className="h-auto p-0 text-info underline">
                Explore features
              </Button>
            </AlertDescription>
          </Alert>
        </FramePanel>
      </Frame>
    </div>
  );
}
