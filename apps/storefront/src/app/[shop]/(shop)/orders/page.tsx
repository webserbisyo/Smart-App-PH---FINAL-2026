import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DEMO_SHOP_SLUGS, words } from '@smartapp/core';
import { getStorefrontForServer } from '@smartapp/data/server';
import { OrdersScreen } from '@/features/orders/components/orders-screen';
import { OrdersSkeleton } from '@/features/orders/components/orders-skeleton';

interface OrdersPageProps {
  params: Promise<{ shop: string }>;
}

export function generateStaticParams() {
  return DEMO_SHOP_SLUGS.map((shop) => ({ shop }));
}

export async function generateMetadata({ params }: OrdersPageProps): Promise<Metadata> {
  const { shop: slug } = await params;
  const shop = getStorefrontForServer(slug);
  if (!shop) return {};
  return {
    title: words.orders.metaTitle(shop.storefront.info.name),
    description: words.orders.metaDescription(shop.storefront.info.name),
    robots: { index: false, follow: false },
  };
}

async function OrdersPageContent({ params }: OrdersPageProps) {
  const { shop: slug } = await params;
  if (!getStorefrontForServer(slug)) notFound();
  // The orders live on this phone (and in the member's account), so the list renders in the browser.
  return <OrdersScreen />;
}

export default function OrdersPage(props: OrdersPageProps) {
  return (
    <Suspense fallback={<OrdersSkeleton />}>
      <OrdersPageContent {...props} />
    </Suspense>
  );
}
