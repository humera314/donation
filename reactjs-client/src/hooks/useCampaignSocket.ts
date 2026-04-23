import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface Donation {
  amount: number;
  donorName: string;
  message: string | null;
  timestamp: string;
}

export interface ProgressUpdate {
  currentAmount: number;
  goalAmount: number;
  percentage: number;
  status: string;
}

interface CampaignSocketState {
  donations: Donation[];
  progress: ProgressUpdate | null;
  viewerCount: number;
  connected: boolean;
}

const SOCKET_URL = process.env.REACT_APP_API_BASE?.replace('/api', '') || 'http://localhost:3200';

export function useCampaignSocket(campaignId: number | null) {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<CampaignSocketState>({
    donations: [],
    progress: null,
    viewerCount: 0,
    connected: false,
  });

  useEffect(() => {
    if (!campaignId) return;

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setState(s => ({ ...s, connected: true }));
      socket.emit('join_campaign', String(campaignId));
    });

    socket.on('disconnect', () => {
      setState(s => ({ ...s, connected: false }));
    });

    socket.on('new_donation', (donation: Donation) => {
      setState(s => ({ ...s, donations: [donation, ...s.donations].slice(0, 20) }));
    });

    socket.on('progress_update', (progress: ProgressUpdate) => {
      setState(s => ({ ...s, progress }));
    });

    socket.on('viewer_count', ({ count }: { count: number }) => {
      setState(s => ({ ...s, viewerCount: count }));
    });

    return () => {
      socket.emit('leave_campaign', String(campaignId));
      socket.disconnect();
    };
  }, [campaignId]);

  const clearDonations = useCallback(() => {
    setState(s => ({ ...s, donations: [] }));
  }, []);

  return { ...state, clearDonations };
}
