import { Button } from '@smartapp/ui/components/button';

export function Pattern() {
  return (
    <Button render={<a href="/" />} nativeButton={false}>
      Back to Home
    </Button>
  );
}
