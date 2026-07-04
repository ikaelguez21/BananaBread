import { useEffect, useMemo, useState } from 'react';
import type { TrackOption } from '../types';

interface TrackSelectorProps {
  open: boolean;
  tracks: TrackOption[];
  onClose: () => void;
  onSelect: (trackId: string) => void;
}

const MAX_VISIBLE = 60;

export default function TrackSelector({ open, tracks, onClose, onSelect }: TrackSelectorProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const filteredTracks = useMemo(
    () => tracks.filter((track) => track.label.toLowerCase().includes(query.toLowerCase())),
    [query, tracks]
  );

  if (!open) return null;

  const visibleTracks = filteredTracks.slice(0, MAX_VISIBLE);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card" style={{ maxWidth: 560, margin: 'auto' }} onClick={(event) => event.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h2>בחר מסלול</h2>
          <button className="button secondary" type="button" onClick={onClose}>סגור</button>
        </div>
        <input
          value={query}
          placeholder="חפש מסלול"
          autoFocus
          onChange={(event) => setQuery(event.target.value)}
          style={{ width: '100%', marginBottom: 16 }}
        />
        <div className="track-list">
          {visibleTracks.length ? (
            visibleTracks.map((track) => (
              <button key={track.id} type="button" className="track-item" onClick={() => onSelect(track.id)}>
                <span>{track.label}</span>
                <span>בחר</span>
              </button>
            ))
          ) : (
            <p>לא נמצאו מסלולים.</p>
          )}
          {filteredTracks.length > MAX_VISIBLE ? (
            <p className="muted" style={{ padding: '8px 4px' }}>
              מוצגים {MAX_VISIBLE} מתוך {filteredTracks.length} — חדד את החיפוש כדי לצמצם.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
