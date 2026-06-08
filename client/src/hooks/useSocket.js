import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

export function useSocket() {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [history, setHistory] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('battery:update', (payload) => {
      setData(payload);
      setHistory((prev) => {
        const next = [...prev, { ...payload, ts: Date.now() }];
        return next.slice(-40); // keep last 40 readings for charts
      });
    });

    return () => socket.disconnect();
  }, []);

  return { data, connected, history, socket: socketRef.current };
}
