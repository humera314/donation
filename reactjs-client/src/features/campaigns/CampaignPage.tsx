import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useCampaignSocket, Donation } from '../../hooks/useCampaignSocket';

interface Campaign {
  id: number;
  title: string;
  description: string;
  goalAmount: number;
  currentAmount: number;
  status: string;
  creatorName: string;
}

interface Props {
  campaignId: number;
}

export function CampaignPage({ campaignId }: Props) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const { donations, progress, viewerCount, connected } = useCampaignSocket(campaignId);

  useEffect(() => {
    axios.get(`/campaigns/${campaignId}`).then(res => setCampaign(res.data));
  }, [campaignId]);

  // Show toast notification when a new donation arrives
  useEffect(() => {
    if (donations.length === 0) return;
    const latest = donations[0];
    setNotification(`${latest.donorName} just donated $${latest.amount}!`);
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [donations]);

  if (!campaign) return <div style={styles.loading}>Loading campaign...</div>;

  const current = progress ? progress.currentAmount : campaign.currentAmount;
  const goal = progress ? progress.goalAmount : campaign.goalAmount;
  const pct = Math.min((Number(current) / Number(goal)) * 100, 100);
  const status = progress ? progress.status : campaign.status;

  return (
    <div style={styles.container}>
      {/* Connection badge */}
      <div style={{ ...styles.badge, background: connected ? '#22c55e' : '#ef4444' }}>
        {connected ? 'Live' : 'Reconnecting...'}
      </div>

      {/* Toast notification */}
      {notification && (
        <div style={styles.toast}>{notification}</div>
      )}

      <h1 style={styles.title}>{campaign.title}</h1>
      <p style={styles.meta}>By {campaign.creatorName} · {viewerCount} watching</p>
      <p style={styles.description}>{campaign.description}</p>

      {/* Progress bar */}
      <div style={styles.progressWrap}>
        <div style={{ ...styles.progressBar, width: `${pct}%`, background: status === 'completed' ? '#22c55e' : '#3b82f6' }} />
      </div>
      <div style={styles.amounts}>
        <span>${Number(current).toLocaleString()} raised</span>
        <span>Goal: ${Number(goal).toLocaleString()}</span>
      </div>
      {status === 'completed' && <div style={styles.completed}>Goal reached!</div>}

      {/* Donation feed */}
      <h2 style={styles.feedTitle}>Live Donations</h2>
      {donations.length === 0 ? (
        <p style={styles.emptyFeed}>No donations yet. Be the first!</p>
      ) : (
        <ul style={styles.feed}>
          {donations.map((d: Donation, i: number) => (
            <li key={i} style={styles.feedItem}>
              <span style={styles.donor}>{d.donorName}</span>
              <span style={styles.amount}>${Number(d.amount).toLocaleString()}</span>
              {d.message && <p style={styles.message}>"{d.message}"</p>}
              <span style={styles.time}>{new Date(d.timestamp).toLocaleTimeString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 640, margin: '0 auto', padding: '24px 16px', fontFamily: 'sans-serif', position: 'relative' },
  loading: { textAlign: 'center', padding: 40, color: '#6b7280' },
  badge: { display: 'inline-block', color: '#fff', fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 99, marginBottom: 16 },
  toast: { position: 'fixed', top: 24, right: 24, background: '#1e293b', color: '#fff', padding: '12px 20px', borderRadius: 8, fontSize: 14, zIndex: 999, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', animation: 'fadeIn 0.3s' },
  title: { fontSize: 28, fontWeight: 700, margin: '0 0 4px' },
  meta: { color: '#6b7280', fontSize: 14, margin: '0 0 16px' },
  description: { color: '#374151', marginBottom: 24 },
  progressWrap: { height: 16, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden', marginBottom: 8 },
  progressBar: { height: '100%', borderRadius: 99, transition: 'width 0.8s ease' },
  amounts: { display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#374151', marginBottom: 8 },
  completed: { textAlign: 'center', background: '#dcfce7', color: '#15803d', padding: '8px 16px', borderRadius: 8, fontWeight: 600, marginBottom: 16 },
  feedTitle: { fontSize: 18, fontWeight: 600, margin: '24px 0 12px' },
  emptyFeed: { color: '#9ca3af', fontStyle: 'italic' },
  feed: { listStyle: 'none', padding: 0, margin: 0 },
  feedItem: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '12px 0', borderBottom: '1px solid #f3f4f6' },
  donor: { fontWeight: 600, flex: 1 },
  amount: { color: '#2563eb', fontWeight: 700 },
  message: { width: '100%', margin: '4px 0 0', color: '#6b7280', fontSize: 13, fontStyle: 'italic' },
  time: { fontSize: 12, color: '#9ca3af' },
};
