'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { useIsMutating } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@flowdesk/shared';
import { MenuIcon, RotateCcwIcon } from 'lucide-react';
import { Link, usePathname, useRouter } from '../i18n/navigation';
import { homePathFor } from '../lib/app-routing';
import { useResetDemo, useSession } from '../lib/queries';
import { errorMessageKey } from '../lib/error-messages';
import { Countdown } from './countdown';
import { IdentitySwitcher } from './identity-switcher';
import { LanguageSelector } from './language-selector';
import { TourPanel } from './tour-panel';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { BrandMark } from './brand-mark';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const session = useSession();
  const reset = useResetDemo();
  const switching = useIsMutating({ mutationKey: ['switch-identity'] }) > 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const cancelButton = useRef<HTMLButtonElement>(null);

  if (session.isPending || (session.isError && session.error.status === 401))
    return (
      <main className="p-6">
        <p role="status">{t('common.loading')}</p>
      </main>
    );
  if (session.isError)
    return (
      <main className="p-6">
        <p role="alert" className="mb-4 text-destructive">
          {t(errorMessageKey(session.error.code ?? 'INTERNAL_ERROR'))}
        </p>
        <Button
          onClick={() => {
            void session.refetch();
          }}
        >
          {t('app.retry')}
        </Button>
      </main>
    );

  const info = session.data;
  const home = homePathFor(info.activeIdentity);
  const navKey = {
    employee: 'requests',
    approver: 'approvals',
    it_agent: 'queue',
  } as const;
  const label = t(`app.nav.${navKey[info.activeIdentity]}`);
  const languageHref =
    pathname === '/app/requests/[id]'
      ? params.id
        ? ({ pathname, params: { id: params.id } } as const)
        : '/app'
      : pathname;
  const navigation = (mobile: boolean) => (
    <div className="flex flex-col gap-6">
      <nav aria-label={t('app.navigation')}>
        <p className="mb-3 px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {t('app.workspace')}
        </p>
        <Link
          href={home}
          aria-current={pathname === home ? 'page' : undefined}
          className="block rounded-md px-3 py-3 text-sm font-semibold text-foreground-secondary outline-none transition-colors duration-150 ring-ring ring-offset-2 hover:bg-row-hover focus-visible:ring-2 aria-[current=page]:bg-primary-soft aria-[current=page]:text-primary-strong"
          onClick={() => {
            if (mobile) setMenuOpen(false);
          }}
        >
          {label}
        </Link>
      </nav>
      <TourPanel />
    </div>
  );
  const brand = (
    <Link
      href="/app"
      className="inline-flex items-center gap-2 rounded-md text-lg font-semibold tracking-tight outline-none ring-ring ring-offset-2 focus-visible:ring-2"
    >
      <BrandMark />
      {t('common.brand')}
    </Link>
  );

  return (
    <div className="grid min-h-svh grid-cols-[minmax(0,1fr)] grid-rows-[auto_auto_1fr] [grid-template-areas:'header'_'context'_'main'] md:grid-cols-[15.5rem_minmax(0,1fr)] md:grid-rows-[3.5rem_1fr] md:[grid-template-areas:'sidebar_header'_'sidebar_main']">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        {t('common.skipToContent')}
      </a>
      <header className="min-w-0 border-b bg-card [grid-area:header]">
        <div className="flex h-14 items-center justify-between gap-2 px-4 md:justify-end md:px-8">
          <div className="flex min-w-0 items-center gap-2 md:hidden">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="md:hidden"
                  aria-label={t('app.openMenu')}
                >
                  <MenuIcon aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{t('app.navigation')}</SheetTitle>
                  <SheetDescription>
                    {t('app.navigationDescription')}
                  </SheetDescription>
                </SheetHeader>
                <div className="px-4 pb-6">{menuOpen && navigation(true)}</div>
              </SheetContent>
            </Sheet>
            {brand}
          </div>
          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            <LanguageSelector href={languageHref} />
            <Dialog
              open={resetOpen}
              onOpenChange={(open) => {
                if (!reset.isPending) {
                  setResetOpen(open);
                  if (open) reset.reset();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="size-10 p-0 md:w-auto md:px-4"
                  aria-label={t('app.reset')}
                  disabled={switching}
                >
                  <RotateCcwIcon aria-hidden="true" />
                  <span className="hidden md:inline">{t('app.reset')}</span>
                </Button>
              </DialogTrigger>
              <DialogContent
                showCloseButton={!reset.isPending}
                onOpenAutoFocus={(event) => {
                  event.preventDefault();
                  cancelButton.current?.focus();
                }}
                onEscapeKeyDown={(event) => {
                  if (reset.isPending) event.preventDefault();
                }}
                onPointerDownOutside={(event) => {
                  if (reset.isPending) event.preventDefault();
                }}
              >
                <DialogHeader>
                  <DialogTitle>{t('app.resetTitle')}</DialogTitle>
                  <DialogDescription>
                    {t('app.resetDescription')}
                  </DialogDescription>
                </DialogHeader>
                {reset.isError && (
                  <p role="alert" className="text-sm text-destructive">
                    {t(errorMessageKey(reset.error.code ?? 'INTERNAL_ERROR'))}
                  </p>
                )}
                <DialogFooter>
                  <Button
                    ref={cancelButton}
                    variant="outline"
                    disabled={reset.isPending}
                    onClick={() => setResetOpen(false)}
                  >
                    {t('app.cancel')}
                  </Button>
                  <Button
                    disabled={reset.isPending}
                    aria-busy={reset.isPending}
                    onClick={() =>
                      reset.mutate(locale, {
                        onSuccess: () => {
                          setResetOpen(false);
                          router.replace(homePathFor('employee'));
                        },
                      })
                    }
                  >
                    {t(reset.isPending ? 'app.resetting' : 'app.confirmReset')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>
      <div className="contents md:sticky md:top-0 md:flex md:h-svh md:min-w-0 md:flex-col md:self-start md:[grid-area:sidebar]">
        <aside
          aria-label={t('app.navigation')}
          className="hidden min-h-0 overflow-y-auto border-r bg-card md:block md:flex-1"
        >
          <div className="flex h-14 items-center px-5">{brand}</div>
          <div className="p-4 pt-6">{navigation(false)}</div>
        </aside>
        <div className="min-w-0 border-b bg-card px-4 py-3 [grid-area:context] md:shrink-0 md:border-r md:border-b-0 md:p-4">
          <Card className="grid min-w-0 grid-cols-[minmax(0,1fr)_7rem] items-center gap-3 border-0 shadow-none md:grid-cols-1 md:gap-4 md:border md:p-3 md:shadow-card">
            <IdentitySwitcher session={info} />
            <Countdown expiresAt={info.expiresAt} />
          </Card>
        </div>
      </div>
      <main
        id="main"
        tabIndex={-1}
        className="min-w-0 p-6 outline-none [grid-area:main] md:p-8"
      >
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
