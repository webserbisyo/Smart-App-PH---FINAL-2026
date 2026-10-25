import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from '@smartapp/ui/components/item';
import { UserIcon, ChevronRightIcon, ShieldIcon, CreditCardIcon } from 'lucide-react';

export function Pattern() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col">
      <ItemGroup className="gap-0">
        <Item render={<a href="#" />} size="xs">
          <ItemMedia variant="icon">
            <UserIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Profile</ItemTitle>
            <ItemDescription>Manage your account details</ItemDescription>
          </ItemContent>
          <ItemActions>
            <ChevronRightIcon className="size-4 text-muted-foreground" />
          </ItemActions>
        </Item>
        <ItemSeparator />
        <Item render={<a href="#" />} size="xs">
          <ItemMedia variant="icon">
            <ShieldIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Security</ItemTitle>
            <ItemDescription>Password and two-factor auth</ItemDescription>
          </ItemContent>
          <ItemActions>
            <ChevronRightIcon className="size-4 text-muted-foreground" />
          </ItemActions>
        </Item>
        <ItemSeparator />
        <Item render={<a href="#" />} size="xs">
          <ItemMedia variant="icon">
            <CreditCardIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Billing</ItemTitle>
            <ItemDescription>Plans, invoices, and payment</ItemDescription>
          </ItemContent>
          <ItemActions>
            <ChevronRightIcon className="size-4 text-muted-foreground" />
          </ItemActions>
        </Item>
      </ItemGroup>
    </div>
  );
}
