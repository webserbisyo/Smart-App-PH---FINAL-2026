import { useEffect, useState } from 'react';

import { Button } from '@smartapp/ui/components/button';
import { Spinner } from '@smartapp/ui/components/spinner';
import { CheckIcon } from 'lucide-react';

type Status = 'idle' | 'loading' | 'success';

export function Pattern() {
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    if (status !== 'success') return;

    const timer = setTimeout(() => setStatus('idle'), 2000);
    return () => clearTimeout(timer);
  }, [status]);

  return (
    <Button
      onClick={() => {
        if (status !== 'idle') return;

        setStatus('loading');
        setTimeout(() => setStatus('success'), 900);
      }}
      disabled={status === 'loading'}
      aria-busy={status === 'loading'}
      aria-live="polite"
      className="min-w-32"
    >
      {status === 'loading' ? (
        <>
          <Spinner aria-hidden="true" />
          Saving…
        </>
      ) : status === 'success' ? (
        <>
          <CheckIcon aria-hidden="true" />
          Saved
        </>
      ) : (
        'Save changes'
      )}
    </Button>
  );
}
