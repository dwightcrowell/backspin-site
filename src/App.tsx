import { HashRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { DataProvider } from "./data/DataProvider";
import { BracketPage } from "./pages/BracketPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { PlayerPage } from "./pages/PlayerPage";
import { PlayersPage } from "./pages/PlayersPage";
import { SchedulePage } from "./pages/SchedulePage";

export default function App() {
  return (
    <HashRouter>
      <DataProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<LeaderboardPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/bracket" element={<BracketPage />} />
            <Route path="/players" element={<PlayersPage />} />
            <Route path="/players/:slug" element={<PlayerPage />} />
            <Route path="*" element={<MissingPage />} />
          </Routes>
        </Layout>
      </DataProvider>
    </HashRouter>
  );
}

function MissingPage() {
  return (
    <div className="page">
      <h1>That page is not on the card.</h1>
      <p className="empty">Try the leaderboard, schedule, bracket, or players list.</p>
    </div>
  );
}
