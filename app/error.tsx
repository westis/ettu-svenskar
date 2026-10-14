'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <h1 className="title">Kunde inte hämta matcherna</h1>
      <p className="meta">ETTU:s resultattjänst svarar inte just nu.</p>
      <p style={{ marginTop: 24 }}>
        <button type="button" className="chip" onClick={() => reset()}>Försök igen</button>
      </p>
    </>
  );
}
