'use client';

import Link from 'next/link';
import { SearchXIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@smartapp/ui/components/empty';
import { useOptionalShop } from '@/features/shell/components/shop-context';

// Pattern c-empty-7. Inside a shop: a page it doesn't have. Otherwise: the shop itself is unknown,
// pending or suspended (another shop's pages also land here, never "forbidden").
export default function ShopNotFound() {
  const shop = useOptionalShop();
  const w = shop ? words.storefrontShell.pageNotFound : words.storefrontShell.notFound;
  const content = (
    <Empty className="py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h1>{w.title}</h1>
        </EmptyTitle>
        <EmptyDescription>{w.body}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={shop ? `/${shop.slug}` : '/'} />}
        >
          {w.back}
        </Button>
      </EmptyContent>
    </Empty>
  );
  if (shop) return content;
  return <main className="flex min-h-dvh items-center justify-center px-4">{content}</main>;
}
