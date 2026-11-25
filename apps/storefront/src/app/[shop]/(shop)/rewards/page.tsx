import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DEMO_SHOP_SLUGS, words } from '@smartapp/core';
import { getShop } from '@/server/shop-read';
import { Spinner } from '@smartapp/ui/components/spinner';
import { RewardsScreen } from '@/features/rewards/components/rewards-screen';

interface RewardsPageProps {
  params: Promise<{ shop: string }>;
}

export function generateStaticParams() {
  return DEMO_SHOP_SLUGS.map((shop) => ({ shop }));
}

export async function generateMetadata({ params }: RewardsPageProps): Promise<Metadata> {
  const { shop: slug } = await params;
  const shop = await getShop(slug);
  if (!shop) return {};
  return {
    title: words.rewards.metaTitle(shop.storefront.info.name),
    description: words.rewards.metaDescription(shop.storefront.info.name),
    robots: { index: false, follow: false },
  };
}

async function RewardsPageContent({ params }: RewardsPageProps) {
  const { shop: slug } = await params;
  if (!(await getShop(slug))) notFound();
  // Member data lives in the customer's session on this phone, so the screen renders in the browser.
  return <RewardsScreen />;
}

export default function RewardsPage(props: RewardsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      }
    >
      <RewardsPageContent {...props} />
    </Suspense>
  );
}
