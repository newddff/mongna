import { notFound } from 'next/navigation';
import SongOverlay from '../../overlay/SongOverlay';

export default function DemoOverlayPage() {
  if (process.env.VERCEL_ENV !== 'preview' && process.env.NODE_ENV !== 'development') notFound();
  return <SongOverlay demo />;
}
