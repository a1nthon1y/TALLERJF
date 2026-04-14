export const LOCALE = 'es-PE';

// Formateadores comunes
export const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

export const shortDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: 'medium'
});

export const numberFormatter = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 0,
  useGrouping: true
});

export const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'PEN'
});

// Funciones helper
export const formatDate = (date) => {
  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

export const formatShortDate = (date) => shortDateFormatter.format(date);
export const formatNumber = (number) => numberFormatter.format(number);
export const formatCurrency = (amount) => currencyFormatter.format(amount); 