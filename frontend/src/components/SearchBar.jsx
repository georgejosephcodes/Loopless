import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import './SearchBar.css';

const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;

// ─── Individual suggestion item ───────────────────────────────────────────────
function SuggestionItem({ suggestion, onSelect, isHighlighted }) {
  const main = suggestion.properties?.name || suggestion.properties?.formatted.split(',')[0];
  const secondary = suggestion.properties?.formatted;

  return (
    <li
      role="option"
      aria-selected={isHighlighted}
      className={`search-item${isHighlighted ? ' is-highlighted' : ''}`}
      onMouseDown={(e) => { e.preventDefault(); onSelect(suggestion); }}
    >
      <MapPin size={16} className="search-item-icon" />
      <div className="search-item-text">
        <span className="truncate">{main}</span>
        <small className="truncate">{secondary}</small>
      </div>
    </li>
  );
}

// ─── Main SearchBar ───────────────────────────────────────────────────────────
const SearchBar = ({ onAdd, disabled }) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | ok | empty | error
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef(null);
  const canSearch = input.trim().length >= 2;

  // ── Fetch predictions from Geoapify ────────────────────────────────────────
  useEffect(() => {
    const value = input.trim();
    if (value.length < 2) return undefined;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (!GEOAPIFY_KEY) {
        console.error('Search: VITE_GEOAPIFY_API_KEY is empty. Set it in frontend/.env and restart npm run dev.');
        setSuggestions([]);
        setStatus('error');
        setShowDropdown(true);
        return;
      }

      setStatus('loading');
      try {
        const res = await fetch(
          `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(value)}&limit=5&filter=countrycode:in&apiKey=${GEOAPIFY_KEY}`,
          { signal: controller.signal }
        );
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          console.error(`Geoapify autocomplete failed: HTTP ${res.status}`, data);
          setSuggestions([]);
          setStatus('error');
          setShowDropdown(true);
          return;
        }

        const features = data.features || [];
        setSuggestions(features);
        setStatus(features.length ? 'ok' : 'empty');
        setHighlightedIdx(-1);
        setShowDropdown(true);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Geoapify autocomplete failed:', err);
        setSuggestions([]);
        setStatus('error');
        setShowDropdown(true);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [input]);

  // ── Handle selection ───────────────────────────────────────────────────────
  const handleSelect = useCallback((prediction) => {
    onAdd({
      name:
        prediction.properties?.name ||
        prediction.properties?.formatted ||
        'Unknown',
      lat: prediction.properties.lat,
      lng: prediction.properties.lon,
    });

    setInput('');
    setSuggestions([]);
    setStatus('idle');
    setShowDropdown(false);
    setHighlightedIdx(-1);
  }, [onAdd]);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx((prev) =>
        Math.min(prev + 1, suggestions.length - 1)
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx((prev) =>
        Math.max(prev - 1, 0)
      );
    } else if (e.key === 'Enter' && highlightedIdx >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIdx]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setHighlightedIdx(-1);
    }
  };

  const clearInput = () => {
    setInput('');
    setSuggestions([]);
    setStatus('idle');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  return (
    <div className="search">
      <div className={`search-box${isFocused ? ' is-focused' : ''}${disabled ? ' is-disabled' : ''}`}>
        <Search size={17} className="search-icon" />
        <input
          ref={inputRef}
          value={input}
          disabled={disabled}
          role="combobox"
          aria-expanded={showDropdown}
          aria-label="Search places"
          placeholder={disabled ? 'Limit reached (15/15)' : 'Search places & landmarks…'}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            if (status === 'ok' || status === 'empty' || status === 'error') setShowDropdown(true);
          }}
          onBlur={() => {
            setIsFocused(false);
            setTimeout(() => setShowDropdown(false), 150);
          }}
        />
        {input.length > 0 && !disabled && (
          <button type="button" className="search-clear" onMouseDown={(e) => { e.preventDefault(); clearInput(); }} aria-label="Clear search">
            <X size={14} />
          </button>
        )}
      </div>

      {showDropdown && canSearch && suggestions.length > 0 && (
        <ul className="search-dropdown" role="listbox">
          {suggestions.map((s, i) => (
            <SuggestionItem
              key={`${s.properties.lat}-${s.properties.lon}-${i}`}
              suggestion={s}
              onSelect={handleSelect}
              isHighlighted={i === highlightedIdx}
            />
          ))}
        </ul>
      )}

      {showDropdown && canSearch && suggestions.length === 0 && (status === 'empty' || status === 'error') && (
        <div className="search-dropdown search-status" role="status">
          {status === 'empty'
            ? 'No places found. Try another spelling.'
            : 'Search is unavailable right now. Check the Geoapify key in frontend/.env and the browser console.'}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
