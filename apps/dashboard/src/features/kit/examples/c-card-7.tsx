import { Badge } from '@smartapp/ui/components/reui/badge';

import { Button } from '@smartapp/ui/components/button';
import { Card, CardContent } from '@smartapp/ui/components/card';
import { BellIcon, SparklesIcon, ArrowRightIcon } from 'lucide-react';
import { useKitShop } from '../kit-shop.js';

export function Pattern() {
  const shop = useKitShop();
  return (
    <Card className="w-full max-w-xs">
      <CardContent className="flex flex-col gap-4">
        <div className="relative h-48 w-full overflow-hidden rounded-lg">
          <img
            src={shop.photo(0)}
            alt={`${shop.name} item photo`}
            width={640}
            height={640}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex items-center justify-between gap-5">
          <Badge variant="outline">
            <BellIcon aria-hidden="true" />
            Trending
          </Badge>
          <div className="flex items-center gap-1">
            <SparklesIcon aria-hidden="true" />
            <span className="text-xs font-medium text-secondary-foreground">Featured</span>
          </div>
        </div>

        <p className="text-sm text-foreground">
          Simplifying your workflow from day one. Manage your tasks, projects, and team in one
          place.
        </p>

        <Button>
          Get Started
          <ArrowRightIcon aria-hidden="true" />
        </Button>
      </CardContent>
    </Card>
  );
}
