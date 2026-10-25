import { Progress, ProgressLabel, ProgressValue } from '@smartapp/ui/components/progress';

export function Pattern() {
  return (
    <div className="mx-auto w-full max-w-xs">
      <Progress value={30} className="progress-thin">
        <ProgressLabel>Small progress</ProgressLabel>
        <ProgressValue />
      </Progress>
    </div>
  );
}
