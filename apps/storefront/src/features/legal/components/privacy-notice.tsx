import type { ReactNode } from 'react';
import Link from 'next/link';
import { LanguagesIcon, MessageCircleMoreIcon, PhoneIcon } from 'lucide-react';
import { artPath, formatManila, words, type Storefront } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Alert, AlertDescription, AlertTitle } from '@smartapp/ui/components/reui/alert';
import { InfoList, type InfoRow } from '@smartapp/ui/compositions/info-list';

const W = words.privacy;
// Change with the text (shown as "Last updated", Manila date).
const UPDATED_AT = '2026-10-26T09:00:00+08:00';

// The Micah faces' licence, linked next to their credit.
const CC_BY_4 = 'https://creativecommons.org/licenses/by/4.0/';

const SECTIONS = ['who', 'collect', 'why', 'phone', 'keep', 'sees', 'rights', 'contact'] as const;
type SectionKey = (typeof SECTIONS)[number];

function sectionId(key: SectionKey): string {
  return `privacy-${key}`;
}

function Section({ id, children }: { id: SectionKey; children: ReactNode }) {
  return (
    <section
      id={sectionId(id)}
      aria-labelledby={`${sectionId(id)}-title`}
      className="flex scroll-mt-24 flex-col gap-2 rounded-3xl bg-card p-4 shadow-xs ring-1 ring-foreground/8 sm:p-5"
    >
      <h2 id={`${sectionId(id)}-title`} className="text-lg font-bold">
        {W[id].title}
      </h2>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 text-muted-foreground marker:text-shop-10-text">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * The shop's privacy notice (T14, decision N37): who collects what and why, what stays on the phone, how
 * long, who sees it, the customer's rights under RA 10173 and how to ask. A Filipino summary sits on top.
 */
export function PrivacyNotice({ storefront }: { storefront: Storefront }) {
  const { slug } = storefront;
  const { name, contact } = storefront.info;
  const contactRows: InfoRow[] = [
    ...(contact.phone
      ? [
          {
            id: 'phone',
            icon: <PhoneIcon />,
            label: W.contact.call,
            description: contact.phone,
            href: `tel:${contact.phone}`,
          },
        ]
      : []),
    ...(contact.messengerUsername
      ? [
          {
            id: 'messenger',
            icon: <MessageCircleMoreIcon />,
            label: W.contact.message,
            description: `m.me/${contact.messengerUsername}`,
            href: `https://m.me/${contact.messengerUsername}`,
            external: true,
          },
        ]
      : []),
  ];

  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-4 pt-2 pb-6">
      <header className="flex items-center gap-4">
        <img
          src={artPath('privacy')}
          alt=""
          width={72}
          height={72}
          decoding="async"
          className="size-16 shrink-0 object-contain drop-shadow-md"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">{W.title}</h1>
          <p className="text-sm text-muted-foreground">{W.intro(name)}</p>
        </div>
      </header>

      <Alert variant="info" id="privacy-filipino" lang="fil">
        <LanguagesIcon aria-hidden="true" />
        <AlertTitle>{W.filipinoTitle}</AlertTitle>
        <AlertDescription>
          <ul className="flex list-disc flex-col gap-1 pl-4">
            {W.filipino.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>

      <nav aria-label={W.contents} className="flex flex-col gap-2 px-1">
        <h2 className="text-sm font-semibold text-muted-foreground">{W.contents}</h2>
        <ul className="flex flex-wrap gap-2">
          {SECTIONS.map((key) => (
            <li key={key}>
              <a
                href={`#${sectionId(key)}`}
                className="inline-flex min-h-11 items-center rounded-full bg-card px-4 text-sm font-medium ring-1 ring-foreground/10 hover:bg-muted"
              >
                {W[key].title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="who">
        <p className="text-muted-foreground">{W.who.body(name)}</p>
        {contact.showAddress && contact.address ? (
          <p className="text-muted-foreground">{W.who.address(contact.address)}</p>
        ) : null}
      </Section>
      <Section id="collect">
        <Bullets items={W.collect.items} />
      </Section>
      <Section id="why">
        <Bullets items={W.why.items} />
        <p className="font-medium">{W.why.never}</p>
      </Section>
      <Section id="phone">
        <p className="text-muted-foreground">{W.phone.body}</p>
      </Section>
      <Section id="keep">
        <Bullets items={W.keep.items} />
      </Section>
      <Section id="sees">
        <p className="text-muted-foreground">{W.sees.body(name)}</p>
      </Section>
      <Section id="rights">
        <p className="text-muted-foreground">{W.rights.body(name)}</p>
      </Section>
      <Section id="contact">
        {contactRows.length > 0 ? (
          <InfoList rows={contactRows} />
        ) : (
          <p className="text-muted-foreground">{W.contact.none}</p>
        )}
      </Section>

      <footer className="flex flex-col items-center gap-3 pt-2 text-center">
        <p className="text-sm text-muted-foreground">
          {W.lastUpdated(formatManila(UPDATED_AT, 'date'))}
        </p>
        <p className="text-xs text-balance text-muted-foreground">
          {W.faceCredits}{' '}
          <a
            href={CC_BY_4}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center underline underline-offset-2 hover:text-foreground"
          >
            {W.faceLicence}
          </a>
        </p>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/${slug}`} />}
          className="h-11 rounded-full px-6"
        >
          {W.back}
        </Button>
      </footer>
    </article>
  );
}
