import type { ReactNode } from 'react';
import { Separator } from '@smartapp/ui/components/separator';

export function KitSection({
  title,
  library,
  path,
  usedIn,
  children,
}: {
  title: string;
  library: string;
  path: string;
  usedIn: string;
  children: ReactNode;
}) {
  return (
    <>
      <Separator />
      <section className="min-w-0 space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm break-words text-muted-foreground">
            Library: {library} · Path: {path} · Used in: {usedIn}
          </p>
        </div>
        {children}
      </section>
    </>
  );
}
