// FILE: src/contexts/SocketContext.jsx
// PATTERN FROM: src/contexts/AuthContext.jsx (existing — useState + useCallback pattern)
// BACKEND CONTRACT:
//   backend/shared/websocket/socket.init.js  — auth via handshake.auth.token
//   backend/shared/websocket/socket.auth.js  — reads token from handshake.auth.token
//   backend/shared/websocket/socket.rooms.js — auto-joins user: + role: rooms on connect
//   backend/server.js — createSocketServer(server)
//
// KEY RULES:
//   - Token is passed as socket.auth = { token } (not headers — as per socket.auth.js)
//   - WS URL from VITE_WS_URL env var, falls back to API base URL origin
//   - Cleanup: every socket.on() must have a corresponding socket.off() in cleanup
//   - Auth errors (4xx) trigger logout via AuthContext

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState(null);
    const socketRef = useRef(null);

    // Derive WS URL from VITE_WS_URL or strip /api suffix from VITE_API_URL
    const getWsUrl = useCallback(() => {
        if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        return apiUrl.replace(/\/api$/, '');
    }, []);

    useEffect(() => {
        // Only connect when authenticated
        if (!isAuthenticated || !user) {
            // Clean up existing socket if user logs out
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setIsConnected(false);
                setConnectionError(null);
            }
            return;
        }

        const token = localStorage.getItem('authToken');
        if (!token) return;

        // Don't re-create if already connected to avoid duplicate connections
        if (socketRef.current?.connected) return;

        const wsUrl = getWsUrl();

        // Create socket — pass token via handshake.auth (as per socket.auth.js)
        const socket = io(wsUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
            timeout: 10000,
        });

        // ── Lifecycle handlers ─────────────────────────────────────────────────────

        const onConnect = () => {
            setIsConnected(true);
            setConnectionError(null);
        };

        const onDisconnect = (reason) => {
            setIsConnected(false);
            if (reason === 'io server disconnect') {
                // Server intentionally disconnected — do not reconnect automatically
                setConnectionError('Server closed the connection');
            }
        };

        const onConnectError = (err) => {
            setIsConnected(false);
            setConnectionError(err.message || 'WebSocket connection failed');
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);

        socketRef.current = socket;

        // Cleanup on unmount or when auth state changes
        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
            socket.disconnect();
            socketRef.current = null;
            setIsConnected(false);
        };
    }, [isAuthenticated, user, getWsUrl]);

    const value = {
        socket: socketRef.current,
        isConnected,
        connectionError,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketContext;
