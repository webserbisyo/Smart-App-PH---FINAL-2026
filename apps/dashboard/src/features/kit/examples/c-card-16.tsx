import { Badge } from '@smartapp/ui/components/reui/badge';

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@smartapp/ui/components/avatar';
import { Button } from '@smartapp/ui/components/button';
import { Card, CardContent } from '@smartapp/ui/components/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import { CheckIcon, MoreVerticalIcon } from 'lucide-react';
import { useKitShop } from '../kit-shop.js';

export function Pattern() {
  const shop = useKitShop();
  return (
    <Card className="w-full max-w-sm p-0">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <Badge variant="secondary">
            <CheckIcon aria-hidden="true" />
            Live
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  aria-label="More options"
                />
              }
            >
              <MoreVerticalIcon aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-32" align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem>Copy link</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm leading-tight font-medium">Integration name</h3>
            <Badge variant="success-light" size="sm">
              Installed
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Short description of the integration and what it does in one line.
          </p>
          <AvatarGroup>
            <Avatar className="size-6">
              <AvatarImage src={shop.face(0)} alt="User 1" />
              <AvatarFallback>SC</AvatarFallback>
            </Avatar>
            <Avatar className="size-6">
              <AvatarImage src={shop.face(1)} alt="User 2" />
              <AvatarFallback>MR</AvatarFallback>
            </Avatar>
            <Avatar className="size-6">
              <AvatarImage src={shop.face(2)} alt="User 3" />
              <AvatarFallback>EW</AvatarFallback>
            </Avatar>
            <AvatarGroupCount className="size-6 border text-xs">+3</AvatarGroupCount>
          </AvatarGroup>
        </div>
        <div className="border-t p-3">
          <Button variant="outline" className="w-full">
            Open
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
