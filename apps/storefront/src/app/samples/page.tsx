import type { Metadata } from 'next';
import { samplesWords } from '@smartapp/core';
import { SamplesScreen } from '@/features/samples/samples-screen';

// The Sample shops page (T109). Share previews use Kanto Smash's picture, the first sample shop.
export const metadata: Metadata = {
  title: samplesWords.title,
  description: samplesWords.metaDescription,
  openGraph: {
    title: samplesWords.title,
    description: samplesWords.metaDescription,
    images: ['/demo/kanto-smash/brand/og.jpg'],
  },
};

export default function SamplesPage() {
  return <SamplesScreen />;
}
