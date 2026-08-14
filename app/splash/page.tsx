export default function SplashPage() {
  return (
    <main aria-label="Onyx loading" className="splash-screen">
      <span className="splash-eyebrow">Local-first workspace</span>
      <span className="splash-version">TAURI / RUST</span>
      <div className="splash-mark-wrap"><div className="splash-orbit" aria-hidden="true" /><div className="splash-mark" aria-hidden="true">O/</div></div>
      <div className="splash-name">ONYX</div>
      <div className="splash-caption">Build, inspect, and ship APIs locally.</div>
      <div className="splash-progress" aria-hidden="true"><span /></div>
      <div className="splash-status">Initializing native workspace</div>
    </main>
  );
}
