import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DEMO_SHOP_SLUGS, words } from '@smartapp/core';
import { getStorefrontForServer } from '@smartapp/data/server';
import { CheckoutFormWrapper } from '@/features/checkout/components/checkout-wrapper';
import { CheckoutSkeleton } from '@/features/checkout/components/checkout-skeleton';

interface CheckoutPageProps {
  params: Promise<{ shop: string }>;
}

export function generateStaticParams() {
  return DEMO_SHOP_SLUGS.map((shop) => ({ shop }));
}

export async function generateMetadata({ params }: CheckoutPageProps): Promise<Metadata> {
  const { shop: slug } = await params;
  const shop = getStorefrontForServer(slug);
  if (!shop) return {};
  return {
    title: words.checkout.metaTitle(shop.storefront.info.name),
    description: words.checkout.metaDescription(shop.storefront.info.name),
    robots: { index: false, follow: false },
  };
}

async function CheckoutPageContent({ params }: CheckoutPageProps) {
  const { shop: slug } = await params;
  const shop = getStorefrontForServer(slug);
  if (!shop) notFound();

  return <CheckoutFormWrapper />;
}

export default function CheckoutPage(props: CheckoutPageProps) {
  return (
    <Suspense fallback={<CheckoutSkeleton />}>
      <CheckoutPageContent {...props} />
    </Suspense>
  );
}
