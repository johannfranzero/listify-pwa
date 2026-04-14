import { useSettingsStore } from '../stores/settings'

export function useCurrency() {
  const { settings } = useSettingsStore()
  const currencyCode = settings?.currency || 'PHP'

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  // Format without cents if perfectly whole, helpful for some condensed UI views
  const formatCurrencyCompact = (value: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const currencySymbol = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
  }).formatToParts(0).find(p => p.type === 'currency')?.value || currencyCode

  return { currencyCode, currencySymbol, formatCurrency, formatCurrencyCompact }
}
