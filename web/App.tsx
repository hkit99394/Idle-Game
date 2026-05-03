import "./styles/app.css";

export function App() {
  return (
    <main className="app-shell">
      <section className="battle-surface">
        <div className="resource-row">
          <span>Silver 0</span>
          <span>Cultivation 0</span>
          <span>Combat Exp 0</span>
        </div>
        <div className="battle-grid">
          <div className="team-panel">
            <h2>Disciples</h2>
            <div className="combatant-card">
              <strong>Iron Fist Disciple</strong>
              <div className="bar outer"><span /></div>
              <div className="bar inner"><span /></div>
            </div>
          </div>
          <div className="enemy-panel">
            <h2>Bamboo Road Bandit</h2>
            <div className="combatant-card enemy">
              <strong>Outer HP / Inner Qi</strong>
              <div className="bar outer"><span /></div>
              <div className="bar inner"><span /></div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
