export function cn(...classes: Array<string | number | boolean | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}