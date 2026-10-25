import type { ComponentType } from 'react';
import { ExternalLinkIcon } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@smartapp/ui/components/card';
import { KIT_PATTERNS, type PatternScreen } from './patterns.js';

/** One card per ReUI pattern of a screen: id, ReUI name, what it is for, the live example and its page. */
export function PatternGrid({
  screen,
  examples,
}: {
  screen: PatternScreen;
  examples: Record<string, ComponentType>;
}) {
  const patterns = KIT_PATTERNS.filter((p) => p.screen === screen);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {patterns.map((pattern) => {
        const Example = examples[pattern.id];
        return (
          <Card key={pattern.id} className="min-w-0">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-mono text-sm">{pattern.id}</span>
                <span className="text-sm font-normal text-muted-foreground">{pattern.name}</span>
              </CardTitle>
              <CardDescription>{pattern.usedFor}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex min-h-24 min-w-0 items-center justify-center overflow-x-auto rounded-lg bg-shop-60 p-4 text-foreground">
                {Example ? <Example /> : null}
              </div>
              <a
                href={pattern.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
              >
                ReUI page
                <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
              </a>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
