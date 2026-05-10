import { Component, useEffect } from "react";
import type { ReactNode } from "react";
import "./styles/app.css";
import { staticData } from "./gameData";
import { GamePanelStack } from "./app/AppPanels";
import { useSaveTools } from "./app/useSaveTools";
import { useWebGameState } from "./state/gameState";

const AUTO_RUN_INTERVAL_MS = 1200;

type AppErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

class AppErrorBoundary extends Component<
  { children: ReactNode },
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    message: ""
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error.message
    };
  }

  componentDidCatch(error: Error) {
    console.error("Path of Jianghu app error", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-shell">
          <section className="app-error-state" role="alert">
            <span className="label">Data Error</span>
            <h1>Game data could not load</h1>
            <p>
              {this.state.message ||
                "The app hit an unexpected data or rendering error."}
            </p>
            <button type="button" onClick={() => window.location.reload()}>
              Reload
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

function GameApp() {
  const game = useWebGameState(staticData);
  const { battleSelectedStage } = game;
  const saveTools = useSaveTools({
    exportSave: game.exportSave,
    importSave: game.importSave,
    resetNewGame: game.resetNewGame,
    timeTravelOfflineFarm: game.timeTravelOfflineFarm
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      battleSelectedStage();
    }, AUTO_RUN_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [battleSelectedStage]);

  return (
    <main className="app-shell">
      <GamePanelStack game={game} saveTools={saveTools} />
    </main>
  );
}

export function App() {
  return (
    <AppErrorBoundary>
      <GameApp />
    </AppErrorBoundary>
  );
}
