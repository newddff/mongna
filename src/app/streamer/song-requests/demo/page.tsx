import { notFound } from 'next/navigation';
import SongRequests from '../SongRequests';

export default function SongRequestsDemoPage() {
  if (process.env.VERCEL_ENV !== 'preview' && process.env.NODE_ENV !== 'development') notFound();
  return <SongRequests demo />;
}
