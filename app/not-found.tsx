import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <h1 className="title">Hittades inte</h1>
      <p className="meta">Sidan finns inte. <Link href="/">Till EM</Link></p>
    </>
  );
}
