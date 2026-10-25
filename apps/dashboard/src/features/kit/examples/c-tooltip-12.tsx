import { Button } from '@smartapp/ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@smartapp/ui/components/tooltip';

export function Pattern() {
  return (
    <div className="flex items-center justify-center">
      <Tooltip>
        <TooltipTrigger className="cursor-not-allowed" render={<span />}>
          <Button variant="outline" disabled>
            Delete Project
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">You need admin access to delete projects</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
