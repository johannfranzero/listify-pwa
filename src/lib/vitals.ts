import { onCLS, onFID, onLCP, onINP, onTTFB, Metric } from 'web-vitals';

export function reportWebVitals(onPerfEntry?: (metric: Metric) => void) {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    onCLS(onPerfEntry);
    onFID(onPerfEntry);
    onLCP(onPerfEntry);
    onINP(onPerfEntry);
    onTTFB(onPerfEntry);
  }
}
