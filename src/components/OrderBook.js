import React, { useEffect, useState, useRef } from "react";
import styled from "styled-components";
import { Centrifuge } from "centrifuge";

const Wrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #121212; /* Set a background color for the entire screen */
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 400px;
  background-color: #1b1b1b;
  color: #ffffff;
  border: 1px solid #333333;
  border-radius: 10px;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  background-color: #333333;
  padding: 10px;
  font-weight: bold;
`;

const OrderList = styled.ul`
  list-style-type: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  max-height: 300px;
`;

const OrderItem = styled.li`
  display: flex;
  justify-content: space-between;
  padding: 5px 10px;
  background-color: ${({ type }) => (type === "bid" ? "#112f11" : "#2f1111")};
  &:nth-child(odd) {
    background-color: ${({ type }) => (type === "bid" ? "#143f14" : "#3f1414")};
  }
`;

const OrderColumn = styled.div`
  width: 33%;
  text-align: right;
`;

const Orderbook = ({ symbol = "BTC-USD" }) => {
  const [bids, setBids] = useState([]);
  const [asks, setAsks] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const sequenceRef = useRef(null);

  useEffect(() => {
    const getToken = async () => {
      // In a real-world scenario, fetch the token from your backend server.
      return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwIiwiZXhwIjo1MjYyNjUyMDEwfQ.x_245iYDEvTTbraw1gt4jmFRFfgMJb-GJ-hsU9HuDik";
    };

    const initializeCentrifuge = async () => {
      const token = await getToken();
      const centrifuge = new Centrifuge("wss://api.testnet.rabbitx.io/ws", {
        token,
      });

      centrifuge.on("connecting", (ctx) =>
        console.log(`Connecting: ${ctx.code}, ${ctx.reason}`)
      );
      centrifuge.on("connected", (ctx) => {
        console.log(`Connected over ${ctx.transport}`);
        setIsConnected(true);
      });
      centrifuge.on("disconnected", (ctx) => {
        console.log(`Disconnected: ${ctx.code}, ${ctx.reason}`);
        setIsConnected(false);
      });

      const sub = centrifuge.newSubscription(`orderbook:${symbol}`);

      sub.on("publication", (ctx) => {
        const { bids: newBids, asks: newAsks, sequence } = ctx.data;

        // Handle sequence number for missed updates
        if (
          sequenceRef.current !== null &&
          sequence !== sequenceRef.current + 1
        ) {
          console.error("Missed sequence number. Resubscribing...");
          sub.unsubscribe();
          sub.subscribe();
          return;
        }

        sequenceRef.current = sequence;

        // Update bids and asks
        setBids((prevBids) => updateOrderbook(prevBids, newBids));
        setAsks((prevAsks) => updateOrderbook(prevAsks, newAsks));
      });

      sub.on("subscribing", (ctx) =>
        console.log(`Subscribing: ${ctx.code}, ${ctx.reason}`)
      );
      sub.on("subscribed", (ctx) => {
        console.log("Subscribed");
        setBids(ctx.data.bids);
        setAsks(ctx.data.asks);
      });
      sub.on("unsubscribed", (ctx) =>
        console.log(`Unsubscribed: ${ctx.code}, ${ctx.reason}`)
      );

      centrifuge.connect();
      sub.subscribe();

      return centrifuge;
    };

    const centrifuge = initializeCentrifuge();

    return () => {
      centrifuge.then((instance) => instance.disconnect());
    };
  }, [symbol]);

  const updateOrderbook = (prevOrders, newOrders) => {
    const updatedOrders = new Map(
      prevOrders.map((order) => [order[0], order[1]])
    );
    newOrders.forEach(([price, size]) => {
      if (size === 0) {
        updatedOrders.delete(price);
      } else {
        updatedOrders.set(price, size);
      }
    });
    return Array.from(updatedOrders.entries()).sort((a, b) => a[0] - b[0]);
  };

  return (
    <Wrapper>
      <Container>
        <Header>
          <span>Orderbook</span>
          <span>Status: {isConnected ? "Connected" : "Disconnected"}</span>
        </Header>
        <Header>
          <span>Price (USD)</span>
          <span>Amount (BTC)</span>
          <span>Total (BTC)</span>
        </Header>
        <OrderList>
          {bids.map(([price, amount], index) => (
            <OrderItem key={index} type="bid">
              <OrderColumn>{price}</OrderColumn>
              <OrderColumn>{amount}</OrderColumn>
              <OrderColumn>{(price * amount).toFixed(4)}</OrderColumn>
            </OrderItem>
          ))}
        </OrderList>
        <OrderList>
          {asks.map(([price, amount], index) => (
            <OrderItem key={index} type="ask">
              <OrderColumn>{price}</OrderColumn>
              <OrderColumn>{amount}</OrderColumn>
              <OrderColumn>{(price * amount).toFixed(4)}</OrderColumn>
            </OrderItem>
          ))}
        </OrderList>
      </Container>
    </Wrapper>
  );
};

export default Orderbook;
