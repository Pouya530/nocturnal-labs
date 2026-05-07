import { permanentRedirect } from 'next/navigation';

/** Legacy path; canonical tunnel experience lives at `/`. */
export default function Wormhole6RedirectPage() {
  permanentRedirect('/');
}
