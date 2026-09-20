import type { ReactNode } from 'react';
import Link from 'next/link';
import './styles.css';

export const metadata = { title: 'Boardgame Catalog' };

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><nav><Link href="/">Boardgame Catalog</Link><Link href="/contribute">Contribute</Link></nav>{children}</body></html>;
}
