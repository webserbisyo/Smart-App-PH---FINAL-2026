import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FlaskConicalIcon } from 'lucide-react';
import { ordersWords } from '@smartapp/core';
import {
  getMockScenario,
  ordersEmpty,
  ordersRush,
  ordersTrickle,
  setMockScenario,
  subscribeMockScenario,
  type MockScenario,
} from '@smartapp/data';
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@smartapp/ui/components/dropdown-menu';

/**
 * Test switches for the mock data (development builds only), inside the toolbar's "⋯" menu so nothing
 * floats over the cards or the dock.
 */
export function DevScenarioMenu() {
  const [scenario, setScenario] = React.useState<MockScenario>(getMockScenario);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    return subscribeMockScenario(() => {
      setScenario(getMockScenario());
      void queryClient.resetQueries();
    });
  }, [queryClient]);

  if (!import.meta.env.DEV) return null;
  const w = ordersWords.dev;

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <FlaskConicalIcon />
        {w.title}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-56">
        <DropdownMenuCheckboxItem
          checked={scenario.ordersMode === 'rush'}
          onClick={() => ordersRush()}
        >
          {w.rush}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={scenario.ordersMode === 'empty'}
          onClick={() => ordersEmpty()}
        >
          {w.empty}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={scenario.ordersMode === 'trickle'}
          onClick={() => ordersTrickle(scenario.ordersMode !== 'trickle')}
        >
          {w.trickle}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={scenario.latency === 'slow'}
          onClick={() =>
            setMockScenario({ latency: scenario.latency === 'slow' ? 'none' : 'slow' })
          }
        >
          {w.slow}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={scenario.fail === 'all'}
          onClick={() => setMockScenario({ fail: scenario.fail === 'all' ? null : 'all' })}
        >
          {w.fail}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={scenario.offline}
          onClick={() => setMockScenario({ offline: !scenario.offline })}
        >
          {w.offline}
        </DropdownMenuCheckboxItem>
        <DropdownMenuItem
          onClick={() =>
            setMockScenario({
              latency: 'none',
              fail: null,
              empty: false,
              offline: false,
              ordersMode: 'default',
            })
          }
        >
          {w.reset}
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
