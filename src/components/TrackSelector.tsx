import { useMemo, useState } from 'react';

interface TrackSelectorProps {
  open: boolean;
  tracks: string[];
  onClose: () => void;
  onSelect: (trackName: string) => void;
}

export default function TrackSelector({ open, tracks, onClose, onSelect }: TrackSelectorProps) {
  const [query, setQuery] = useState('');

  const filteredTracks = useMemo(
    () => tracks.filter((track) => track.toLowerCase().includes(query.toLowerCase())),
    [query, tracks]
  );

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="card" style={{ maxWidth: 560, margin: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h2>בחר מסלול</h2>
          <button className="button secondary" type="button" onClick={onClose}>סגור</button>
        </div>
        <input
          value={query}
          placeholder="חפש מסלול"
          onChange={(event) => setQuery(event.target.value)}
          style={{ width: '100%', marginBottom: 16 }}
        />
        <div className="track-list">
          {filteredTracks.length ? (
            filteredTracks.map((track) => (
              <button key={track} type="button" className="track-item" onClick={() => onSelect(track)}>
                <span>{track}</span>
                <span>בחר</span>
              </button>
            ))
          ) : (
            <p>לא נמצאו מסלולים.</p>
          )}
        </div>
      </div>
    </div>
  );
}
