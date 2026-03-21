import Game from "./game/Game";

function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1e1e1e",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <h1>Block Build</h1>

      <button
        style={{
          padding: "10px 16px",
          marginBottom: "20px",
          cursor: "pointer",
          fontSize: "16px",
        }}
      >
        Connect Wallet
      </button>

      <Game />
    </div>
  );
}

export default App;