import { useEffect } from "react";
import { ExamplePortfolioPage } from "./components/ExamplePortfolioPage";
import { LandingPage } from "./components/LandingPage";
import { NotFoundPage } from "./components/NotFoundPage";
import { PublicPortfolioPage } from "./components/PublicPortfolioPage";
import { StudioPage } from "./components/StudioPage";
import { createSession } from "./lib/backend";

function App() {
  useEffect(() => {
  createSession()
    .then((data) => {
      console.log("Session created:", data.sessionId);
    })
    .catch((error) => {
      console.error("Session creation failed:", error);
    });
}, []);

  const parts = window.location.pathname.split("/").filter(Boolean);
  const [route, username] = parts;

  if (route === "studio" && username) {
    return <StudioPage username={decodeURIComponent(username)} />;
  }

  if (route === "portfolio" && username) {
    return <PublicPortfolioPage username={decodeURIComponent(username)} />;
  }

  if (route === "example") {
    return <ExamplePortfolioPage />;
  }

  if (parts.length > 0) return <NotFoundPage />;

  return <LandingPage />;
}

export default App;