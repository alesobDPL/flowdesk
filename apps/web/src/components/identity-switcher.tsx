'use client';

import { useId } from 'react';
import { DEMO_IDENTITIES, type SessionInfo } from '@flowdesk/shared';
import { useTranslations } from 'next-intl';
import { useRouter } from '../i18n/navigation';
import { homePathFor } from '../lib/app-routing';
import { useSwitchIdentity } from '../lib/queries';
import { errorMessageKey } from '../lib/error-messages';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export function IdentitySwitcher({ session }: { session: SessionInfo }) {
  const id = useId();
  const t = useTranslations();
  const router = useRouter();
  const change = useSwitchIdentity();
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {t('app.viewingAs')}
      </Label>
      <Select
        value={session.activeIdentity}
        disabled={change.isPending}
        onValueChange={(value) => {
          const identity = DEMO_IDENTITIES.find(
            (identity) => identity === value,
          );
          if (identity && identity !== session.activeIdentity)
            change.mutate(identity, {
              onSuccess: () => router.replace(homePathFor(identity)),
            });
        }}
      >
        <SelectTrigger
          id={id}
          aria-busy={change.isPending}
          aria-describedby={change.isError ? `${id}-error` : undefined}
          className="h-auto min-h-10 w-full min-w-0 max-w-full text-left [&>span]:min-w-0 [&>svg]:shrink-0"
        >
          <SelectValue>
            <span className="block whitespace-normal">
              {session.user.displayName} ·{' '}
              {t(`app.identities.${session.activeIdentity}`)}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {session.identities.map(({ identity, user }) => (
            <SelectItem key={identity} value={identity}>
              {user.displayName} · {t(`app.identities.${identity}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {change.isError && (
        <p
          id={`${id}-error`}
          role="alert"
          className="max-w-sm text-sm text-destructive"
        >
          {t(errorMessageKey(change.error.code ?? 'INTERNAL_ERROR'))}
        </p>
      )}
    </div>
  );
}
