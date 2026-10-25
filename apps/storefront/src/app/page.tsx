import { StoreIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@smartapp/ui/components/card';

const DASHBOARD_URL = 'https://app.webserbisyo.com';

// The platform root: what Smart App PH is, and one link for shop owners. Static.
export default function PlatformPage() {
  const w = words.storefrontShell.platform;
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-4 py-10">
      <div className="flex flex-col gap-3">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <StoreIcon aria-hidden="true" />
        </span>
        <h1 className="text-3xl font-bold tracking-tight">{w.title}</h1>
        <p className="text-base text-muted-foreground">{w.intro}</p>
        <p className="text-base text-muted-foreground">{w.shopHint}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{w.ownerTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <Button size="lg" nativeButton={false} render={<a href={DASHBOARD_URL} />}>
            {w.ownerLink}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
