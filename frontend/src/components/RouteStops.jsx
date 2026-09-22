import React from 'react';
import { Flag } from 'lucide-react';
import { pinFor, RETURN_PIN } from '../constants/pins';

/** Vertical stop list with cumulative distance. `stops` comes from buildPathWithDistances. */
const RouteStops = ({ stops, selectedIdx, onSelect }) => (
  <ol className="timeline">
    {stops.map((loc, i) => {
      const isLast = i === stops.length - 1;
      const mapIndex = loc.isReturn ? 0 : i;
      const isSelected = selectedIdx === mapIndex;
      const pin = loc.isReturn ? RETURN_PIN : pinFor(i);
      const seg = i > 0 ? parseFloat(loc.accumulated) - parseFloat(stops[i - 1].accumulated) : 0;

      return (
        <li
          key={`${loc.id}-${i}`}
          className={`tl-item${isSelected ? ' is-selected' : ''}`}
          style={{ '--pin': pin.bg }}
          onClick={() => onSelect(i)}
        >
          <div className="tl-rail">
            <span className="tl-pin" style={{ background: pin.bg, color: pin.fg }}>
              {loc.isReturn ? <Flag size={13} strokeWidth={2.5} /> : i + 1}
            </span>
            {!isLast && <span className="tl-line" />}
          </div>
          <div className="tl-body">
            <div className="tl-name truncate">{loc.name}</div>
            <div className="tl-meta">
              {loc.isStart && <span className="badge badge-success">START</span>}
              {loc.isReturn && <span className="badge badge-accent">COMPLETE</span>}
              {seg > 0 && <span className="num">+{seg.toFixed(2)} km</span>}
              {loc.isEstimatedLeg && <span className="badge" title="Real road distance unavailable for this leg; using a straight-line estimate">~ estimated</span>}
            </div>
          </div>
          <div className="tl-dist num">
            {loc.accumulated} km
            <small>accumulated</small>
          </div>
        </li>
      );
    })}
  </ol>
);

export default RouteStops;
