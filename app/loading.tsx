export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Laddar">
      <div className="sk sk-title" />
      <div className="sk sk-meta" />
      <div className="sk sk-chips" />
      <div className="sk sk-chips" />
      <div style={{ marginTop: 48 }}>
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="sk sk-row" />)}
      </div>
    </div>
  );
}
