'use client';

import { Theme } from '@carbon/react';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <Theme theme="white">{children}</Theme>;
}
