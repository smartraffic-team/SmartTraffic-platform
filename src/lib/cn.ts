import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...items: (string | false | undefined)[]) =>
  twMerge(clsx(items));
