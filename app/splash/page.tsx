export default function SplashPage() {
  return (
    <main aria-label="Onyx loading" className="splash-screen">
      <div className="splash-card">
        <div className="splash-mark" aria-hidden="true">O/</div>
        <div className="splash-name">ONYX</div>
        <div className="splash-caption">Local-first API workspace</div>
        <div className="splash-progress" aria-hidden="true"><span /></div>
      </div>
    </main>
  );
}
