import React from "react";
import Orderbook from "./components/OrderBook";

const App = () => {
  return (
    <div className="App">
      <Orderbook websocketUrl="wss://your-websocket-url" />
    </div>
  );
};

export default App;
