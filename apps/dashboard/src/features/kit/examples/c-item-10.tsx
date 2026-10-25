import { Badge } from '@smartapp/ui/components/reui/badge';

import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from '@smartapp/ui/components/avatar';
import { Button } from '@smartapp/ui/components/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemHeader,
  ItemTitle,
} from '@smartapp/ui/components/item';
import { Progress } from '@smartapp/ui/components/progress';
import { FolderIcon } from 'lucide-react';
import { useKitShop } from '../kit-shop.js';

export function Pattern() {
  const shop = useKitShop();
  return (
    <div className="mx-auto flex w-full max-w-xs flex-col gap-3">
      <Item variant="outline">
        <ItemHeader>
          <div className="flex items-center gap-2">
            <FolderIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="text-xs text-muted-foreground">Project</span>
          </div>
          <Badge variant="info-light" size="xs">
            In Progress
          </Badge>
        </ItemHeader>
        <ItemContent>
          <ItemTitle>Website Redesign</ItemTitle>
          <ItemDescription>
            Complete overhaul of the marketing site with a focus on conversion optimization and
            modern design patterns.
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="outline" size="sm">
            Open
          </Button>
        </ItemActions>
        <ItemFooter>
          <AvatarGroup>
            <Avatar size="sm">
              <AvatarImage src={shop.photo(3, 320)} alt="SC" />
              <AvatarFallback>SC</AvatarFallback>
            </Avatar>
            <Avatar size="sm">
              <AvatarImage src={shop.photo(4, 320)} alt="AJ" />
              <AvatarFallback>AJ</AvatarFallback>
            </Avatar>
            <Avatar size="sm">
              <AvatarImage src={shop.photo(5, 320)} alt="EP" />
              <AvatarFallback>EP</AvatarFallback>
            </Avatar>
          </AvatarGroup>
          <div className="flex items-center gap-2">
            <Progress value={65} className="w-20" />
            <span className="text-xs text-muted-foreground">65%</span>
          </div>
        </ItemFooter>
      </Item>
    </div>
  );
}
