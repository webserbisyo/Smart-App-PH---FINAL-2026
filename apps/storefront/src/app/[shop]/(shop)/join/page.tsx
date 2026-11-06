import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DEMO_SHOP_SLUGS, words } from '@smartapp/core';
import { getStorefrontForServer } from '@smartapp/data/server';
import { Spinner } from '@smartapp/ui/components/spinner';
import { JoinFlow } from '@/features/rewards/components/join-flow';

interface JoinPageProps {
  params: Promise<{ shop: string }>;
}

export function generateStaticParams() {
  return DEMO_SHOP_SLUGS.map((shop) => ({ shop }));
}

export async function generateMetadata({ params }: JoinPageProps): Promise<Metadata> {
  const { shop: slug } = await params;
  const shop = getStorefrontForServer(slug);
  if (!shop) return {};
  return {
    title: words.join.metaTitle(shop.storefront.info.name),
    description: words.join.metaDescription(shop.storefront.info.name),
    robots: { index: false, follow: false },
  };
}

async function JoinPageContent({ params }: JoinPageProps) {
  const { shop: slug } = await params;
  if (!getStorefrontForServer(slug)) notFound();
  // Member data lives in the customer's session on this phone, so the screen renders in the browser.
  return <JoinFlow />;
}

export default function JoinPage(props: JoinPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      }
    >
      <JoinPageContent {...props} />
    </Suspense>
  );
}
