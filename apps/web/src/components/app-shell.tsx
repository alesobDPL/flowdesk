'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { useIsMutating } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@flowdesk/shared';
import { LayersIcon, MenuIcon, RotateCcwIcon } from 'lucide-react';
import { Link, usePathname, useRouter } from '../i18n/navigation';
import { homePathFor } from '../lib/app-routing';
import { useResetDemo, useSession } from '../lib/queries';
import { errorMessageKey } from '../lib/error-messages';
import { Countdown } from './countdown';
import { IdentitySwitcher } from './identity-switcher';
import { LanguageSelector } from './language-selector';
import { TourPanel } from './tour-panel';
import { Button } from './ui/button';
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
        <Link
          href={home}
          aria-current={pathname === home ? 'page' : undefined}
          className="block rounded-lg bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

  return (
    <div className="min-h-svh">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        {t('common.skipToContent')}
      </a>
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
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
            <Link
              href="/app"
              className="flex items-center gap-2 rounded-md text-xl font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <LayersIcon className="size-5" aria-hidden="true" />
              </span>
              {t('common.brand')}
            </Link>
          </div>
          <div className="flex items-center gap-3">
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
                  aria-label={t('app.reset')}
                  disabled={switching}
                >
                  <RotateCcwIcon aria-hidden="true" />
                  <span className="hidden sm:inline">{t('app.reset')}</span>
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
          <div className="flex w-full flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Countdown expiresAt={info.expiresAt} />
            <IdentitySwitcher session={info} />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl md:grid-cols-[17rem_1fr]">
        <aside
          aria-label={t('app.navigation')}
          className="hidden min-h-[calc(100svh-11rem)] border-r p-5 md:block"
        >
          {navigation(false)}
        </aside>
        <main
          id="main"
          tabIndex={-1}
          className="min-w-0 p-6 outline-none sm:p-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
