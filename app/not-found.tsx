import Link from "next/link";

export default function NotFound() {
  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">404</h1>
        <div className="sub">
          JUEGO NO ENCONTRADO <span className="blink">_</span>
        </div>
      </section>
      <div style={{ textAlign: "center", padding: "8px 16px 80px", color: "var(--ink-dim)" }}>
        <p style={{ marginBottom: 28 }}>Este cartucho no está en el vault. Revisa la dirección o elige otro juego.</p>
        <Link href="/" className="btn lg">
          VOLVER AL VAULT
        </Link>
      </div>
    </div>
  );
}
