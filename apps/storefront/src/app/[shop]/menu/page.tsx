import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DEMO_SHOP_SLUGS, vocab } from '@smartapp/core';
import { getStorefrontForServer } from '@smartapp/data/server';
import { MenuContent } from '@/features/menu/components/menu-content';
import { MenuSkeleton } from '@/features/menu/components/menu-skeleton';

interface MenuPageProps {
  params: Promise<{ shop: string }>;
}

export function generateStaticParams() {
  return DEMO_SHOP_SLUGS.map((shop) => ({ shop }));
}

export async function generateMetadata({ params }: MenuPageProps): Promise<Metadata> {
  const { shop: slug } = await params;
  const shop = getStorefrontForServer(slug);
  if (!shop) return {};
  const kind = vocab(shop.storefront.info.kind);
  const title = `${kind.catalog} · ${shop.storefront.info.name}`;
  return {
    title,
    description: `Browse the ${kind.catalog.toLowerCase()} of ${shop.storefront.info.name}`,
  };
}

async function CachedMenu({ slug }: { slug: string }) {
  'use cache';
  const shop = getStorefrontForServer(slug);
  if (!shop) notFound();

  const kind = vocab(shop.storefront.info.kind);
  return <MenuContent catalog={shop.catalog} catalogTitle={kind.catalog} />;
}

async function MenuPageContent({ params }: MenuPageProps) {
  const { shop: slug } = await params;
  return <CachedMenu slug={slug} />;
}

export default function MenuPage(props: MenuPageProps) {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <MenuPageContent {...props} />
    </Suspense>
  );
}
