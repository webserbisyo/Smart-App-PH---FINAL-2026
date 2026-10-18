import { notFound } from 'next/navigation';
import { DEMO_SHOP_SLUGS, words } from '@smartapp/core';

interface ShopPageProps {
  params: Promise<{
    shop: string;
  }>;
}

export function generateStaticParams() {
  return DEMO_SHOP_SLUGS.map((shop) => ({
    shop,
  }));
}

export default async function ShopPage({ params }: ShopPageProps) {
  const { shop } = await params;
  const exists = DEMO_SHOP_SLUGS.some((slug: string) => slug === shop);
  if (!exists) {
    notFound();
  }

  return <main>{words.storefront}</main>;
}
