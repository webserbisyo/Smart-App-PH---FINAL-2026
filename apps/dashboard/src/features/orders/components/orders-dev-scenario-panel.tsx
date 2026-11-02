import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getMockScenario,
  ordersEmpty,
  ordersRush,
  ordersTrickle,
  setMockScenario,
  subscribeMockScenario,
  type MockScenario,
} from '@smartapp/data';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { Button } from '@smartapp/ui/components/button';
import { BugIcon, XIcon } from 'lucide-react';
import { cn } from 'cn';

export function OrdersDevScenarioPanel() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [scenario, setScenario] = React.useState<MockScenario>(getMockScenario);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    return subscribeMockScenario(() => {
      setScenario(getMockScenario());
      void queryClient.resetQueries();
    });
  }, [queryClient]);

  if (!import.meta.env.DEV) return null;

  const handleToggleSlow = () => {
    const next = scenario.latency === 'slow' ? 'none' : 'slow';
    setMockScenario({ latency: next });
  };

  const handleToggleError = () => {
    const next = scenario.fail === 'all' ? null : 'all';
    setMockScenario({ fail: next });
  };

  const handleLunchRush = () => {
    ordersRush();
  };

  const handleEmptyDay = () => {
    ordersEmpty();
  };

  const handleToggleTrickle = () => {
    const isTrickle = scenario.ordersMode === 'trickle';
    ordersTrickle(!isTrickle);
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
      ordersMode: 'default',
    });
  };

  const hasOverrides =
    scenario.latency !== 'none' ||
    scenario.fail !== null ||
    scenario.empty ||
    scenario.offline ||
    scenario.ordersMode !== 'default';

  return (
    <div className="fixed bottom-28 left-2 z-50 md:right-4 md:bottom-4 md:left-auto">
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
        <div className="w-72 space-y-3 rounded-xl border border-border/80 bg-background/95 p-3 text-xs shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <BugIcon className="size-3.5 text-primary" />
              Orders Dev Scenarios
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
              onClick={handleLunchRush}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border p-2 text-left transition-colors',
                scenario.ordersMode === 'rush'
                  ? 'border-primary/50 bg-primary/10 font-semibold text-primary'
                  : 'border-border/40 hover:bg-muted/30',
              )}
            >
              <span>Lunch rush (20+ orders)</span>
              <Badge variant={scenario.ordersMode === 'rush' ? 'default' : 'outline'} size="xs">
                {scenario.ordersMode === 'rush' ? 'ON' : 'SET'}
              </Badge>
            </button>

            <button
              type="button"
              onClick={handleEmptyDay}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border p-2 text-left transition-colors',
                scenario.ordersMode === 'empty'
                  ? 'border-primary/50 bg-primary/10 font-semibold text-primary'
                  : 'border-border/40 hover:bg-muted/30',
              )}
            >
              <span>Empty day (0 orders)</span>
              <Badge variant={scenario.ordersMode === 'empty' ? 'default' : 'outline'} size="xs">
                {scenario.ordersMode === 'empty' ? 'ON' : 'SET'}
              </Badge>
            </button>

            <button
              type="button"
              onClick={handleToggleTrickle}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border p-2 text-left transition-colors',
                scenario.ordersMode === 'trickle'
                  ? 'border-success/50 bg-success-soft font-semibold text-success-text'
                  : 'border-border/40 hover:bg-muted/30',
              )}
            >
              <span>New order every 20s</span>
              <Badge variant={scenario.ordersMode === 'trickle' ? 'success' : 'outline'} size="xs">
                {scenario.ordersMode === 'trickle' ? 'ON' : 'OFF'}
              </Badge>
            </button>

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
              <Badge variant={scenario.latency === 'slow' ? 'default' : 'outline'} size="xs">
                {scenario.latency === 'slow' ? 'ON' : 'OFF'}
              </Badge>
            </button>

            <button
              type="button"
              onClick={handleToggleError}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border p-2 text-left transition-colors',
                scenario.fail === 'all'
                  ? 'border-destructive/50 bg-destructive/10 font-semibold text-destructive'
                  : 'border-border/40 hover:bg-muted/30',
              )}
            >
              <span>Server Error (500)</span>
              <Badge variant={scenario.fail === 'all' ? 'destructive' : 'outline'} size="xs">
                {scenario.fail === 'all' ? 'ON' : 'OFF'}
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
              <Badge variant={scenario.offline ? 'destructive' : 'outline'} size="xs">
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
              className="h-7 w-full text-xs font-semibold"
            >
              Reset to Normal
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
