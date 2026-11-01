import * as React from 'react';
import {
  setMockScenario,
  getMockScenario,
  subscribeMockScenario,
  type MockScenario,
} from '@smartapp/data';
import { Badge } from '@smartapp/ui/components/badge';
import { Button } from '@smartapp/ui/components/button';
import { BugIcon, XIcon } from 'lucide-react';
import { cn } from 'cn';

export function DevScenarioPanel() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [scenario, setScenario] = React.useState<MockScenario>(getMockScenario);

  React.useEffect(() => {
    return subscribeMockScenario(() => {
      setScenario(getMockScenario());
    });
  }, []);

  if (!import.meta.env.DEV) return null;

  const handleToggleSlow = () => {
    const next = scenario.latency === 'slow' ? 'none' : 'slow';
    setMockScenario({ latency: next });
  };

  const handleToggleError = () => {
    const next = scenario.fail === 'catalog' ? null : 'catalog';
    setMockScenario({ fail: next });
  };

  const handleToggleEmpty = () => {
    setMockScenario({ empty: !scenario.empty });
  };

  const handleToggleOffline = () => {
    setMockScenario({ offline: !scenario.offline });
  };

  const handleReset = () => {
    setMockScenario({
      latency: 'none',
      fail: null,
      empty: false,
      offline: false,
    });
  };

  const hasOverrides =
    scenario.latency !== 'none' || scenario.fail !== null || scenario.empty || scenario.offline;

  return (
    <div className="fixed right-4 bottom-4 z-50">
      {!isOpen ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setIsOpen(true)}
          className={cn(
            'h-8 gap-1.5 font-mono text-xs shadow-lg backdrop-blur-md',
            hasOverrides
              ? 'border-warning/50 bg-warning-soft text-warning-text'
              : 'bg-background/90',
          )}
        >
          <BugIcon className="size-3.5" />
          Dev Scenarios
          {hasOverrides && <span className="size-1.5 rounded-full bg-warning" />}
        </Button>
      ) : (
        <div className="w-64 space-y-3 rounded-xl border border-border/80 bg-background/95 p-3 text-xs shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <BugIcon className="size-3.5 text-primary" />
              Dev Scenarios
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>

          <div className="space-y-1.5">
            <button
              type="button"
              onClick={handleToggleSlow}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border p-2 text-left transition-colors',
                scenario.latency === 'slow'
                  ? 'border-warning/50 bg-warning-soft font-semibold text-warning-text'
                  : 'border-border/40 hover:bg-muted/30',
              )}
            >
              <span>Slow Latency (2s)</span>
              <Badge
                variant={scenario.latency === 'slow' ? 'default' : 'outline'}
                className="text-xs"
              >
                {scenario.latency === 'slow' ? 'ON' : 'OFF'}
              </Badge>
            </button>

            <button
              type="button"
              onClick={handleToggleError}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border p-2 text-left transition-colors',
                scenario.fail === 'catalog'
                  ? 'border-destructive/50 bg-destructive/10 font-semibold text-destructive'
                  : 'border-border/40 hover:bg-muted/30',
              )}
            >
              <span>Catalog Error (500)</span>
              <Badge
                variant={scenario.fail === 'catalog' ? 'destructive' : 'outline'}
                className="text-xs"
              >
                {scenario.fail === 'catalog' ? 'ON' : 'OFF'}
              </Badge>
            </button>

            <button
              type="button"
              onClick={handleToggleEmpty}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border p-2 text-left transition-colors',
                scenario.empty
                  ? 'border-primary/50 bg-primary/10 font-semibold text-primary'
                  : 'border-border/40 hover:bg-muted/30',
              )}
            >
              <span>Empty State</span>
              <Badge variant={scenario.empty ? 'default' : 'outline'} className="text-xs">
                {scenario.empty ? 'ON' : 'OFF'}
              </Badge>
            </button>

            <button
              type="button"
              onClick={handleToggleOffline}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border p-2 text-left transition-colors',
                scenario.offline
                  ? 'border-destructive/50 bg-destructive/10 font-semibold text-destructive'
                  : 'border-border/40 hover:bg-muted/30',
              )}
            >
              <span>Offline Mode</span>
              <Badge variant={scenario.offline ? 'destructive' : 'outline'} className="text-xs">
                {scenario.offline ? 'ON' : 'OFF'}
              </Badge>
            </button>
          </div>

          {hasOverrides && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-7 w-full text-xs"
            >
              Reset to Normal
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
