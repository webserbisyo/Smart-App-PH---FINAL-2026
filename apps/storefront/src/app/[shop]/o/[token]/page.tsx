import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DEMO_SHOP_SLUGS } from '@smartapp/core';
import { DEMO_RECEIPT_TOKENS } from '@smartapp/data';
import { getOrderReceiptForServer, getStorefrontForServer } from '@smartapp/data/server';
import { ReceiptWrapper } from '@/features/receipt/components/receipt-wrapper';
import { ReceiptSkeleton } from '@/features/receipt/components/receipt-skeleton';

interface ReceiptPageProps {
  params: Promise<{ shop: string; token: string }>;
}

export function generateStaticParams() {
  const params: Array<{ shop: string; token: string }> = [];
  for (const shop of DEMO_SHOP_SLUGS) {
    for (const token of DEMO_RECEIPT_TOKENS) {
      params.push({ shop, token });
    }
  }
  return params;
}

export async function generateMetadata({ params }: ReceiptPageProps): Promise<Metadata> {
  const { shop: slug, token } = await params;
  const shop = getStorefrontForServer(slug);
  if (!shop) return { robots: { index: false, follow: false } };
  return {
    title: `Order · ${shop.storefront.info.name}`,
    description: `Order receipt ${token} from ${shop.storefront.info.name}`,
    robots: { index: false, follow: false },
  };
}

async function ReceiptPageContent({ params }: ReceiptPageProps) {
  const { shop: slug, token } = await params;
  const shop = getStorefrontForServer(slug);
  if (!shop) notFound();

  const initialOrder = await getOrderReceiptForServer(slug, token);

  return <ReceiptWrapper slug={slug} token={token} initialOrder={initialOrder} />;
}

export default function ReceiptPage(props: ReceiptPageProps) {
  return (
    <Suspense fallback={<ReceiptSkeleton />}>
      <ReceiptPageContent {...props} />
    </Suspense>
  );
}
