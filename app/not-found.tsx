import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <h1 className="title">Hittades inte</h1>
      <p className="meta">Tävlingen finns inte hos ETTU. <Link href="/tavlingar">Alla tävlingar</Link></p>
    </>
  );
}
