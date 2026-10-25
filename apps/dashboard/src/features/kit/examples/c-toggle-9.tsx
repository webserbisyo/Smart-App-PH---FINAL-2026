import { useState } from 'react';

import { Toggle } from '@smartapp/ui/components/toggle';
import { HeartIcon } from 'lucide-react';

export function Pattern() {
  const [pressed, setPressed] = useState(false);

  return (
    <div className="flex items-center justify-center">
      <Toggle aria-label="Toggle favorite" pressed={pressed} onPressedChange={setPressed}>
        {pressed ? <HeartIcon className="fill-current" /> : <HeartIcon />}
      </Toggle>
    </div>
  );
}
