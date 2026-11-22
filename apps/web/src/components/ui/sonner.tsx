'use client';

import type * as React from 'react';
import { Toaster as Sonner } from 'sonner';
import { useTranslations } from 'next-intl';

function Toaster(props: React.ComponentProps<typeof Sonner>) {
  const t = useTranslations('common');
  return (
    <Sonner
      theme="light"
      className="toaster group"
      containerAriaLabel={t('notifications')}
      toastOptions={{
        classNames: {
          toast: '!border-border !bg-popover !text-popover-foreground',
          description: '!text-muted-foreground',
        },
      }}
      {...props}
    />
  );
}
export { Toaster };
