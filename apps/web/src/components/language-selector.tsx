'use client';

import { hasLocale, useLocale, useTranslations } from 'next-intl';
import { useRouter } from '../i18n/navigation';
import { routing } from '../i18n/routing';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export function LanguageSelector({ href }: { href: '/' | '/demo-expired' }) {
  const locale = useLocale();
  const t = useTranslations('common');
  const router = useRouter();
  return (
    <Select
      value={locale}
      onValueChange={(value) => {
        if (hasLocale(routing.locales, value))
          router.replace(href, { locale: value });
      }}
    >
      <SelectTrigger aria-label={t('language')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="es">
          <span lang="es">{t('spanish')}</span>
        </SelectItem>
        <SelectItem value="en">
          <span lang="en">{t('english')}</span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
