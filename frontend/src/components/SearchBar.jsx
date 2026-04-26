import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, X } from 'lucide-react';

// ─── Individual suggestion item ───────────────────────────────────────────────
function SuggestionItem({ suggestion, onSelect, dark, isHighlighted }) {
  const main = suggestion.properties?.name || suggestion.properties?.formatted.split(',')[0];
  const secondary = suggestion.properties?.formatted;

  const t = {
    itemBg: isHighlighted
      ? (dark ? '#334155' : '#eff6ff')
      : 'transparent',
    itemText: dark ? '#e2e8f0' : '#1e293b',
    itemSub: dark ? '#64748b' : '#94a3b8',
    iconColor: isHighlighted
      ? '#3b82f6'
      : (dark ? '#475569' : '#cbd5e1'),
  };

  return (
    <li
      onMouseDown={(e) => { e.preventDefault(); onSelect(suggestion); }}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '10px 14px', cursor: 'pointer',
        backgroundColor: t.itemBg, transition: 'background-color 0.12s',
        borderRadius: '8px', margin: '2px 6px',
      }}
    >
      <MapPin size={15} color={t.iconColor} style={{ flexShrink: 0 }} />
      <div style={{ overflow: 'hidden', flex: 1 }}>
        <div style={{
          fontWeight: 600, fontSize: '13.5px', color: t.itemText,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {main}
        </div>
        <div style={{
          fontSize: '11px', color: t.itemSub, marginTop: '1px',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {secondary}
        </div>
      </div>
    </li>
  );
}

// ─── Main SearchBar ───────────────────────────────────────────────────────────
const SearchBar = ({ onAdd, disabled, dark }) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const isLoaded = true;

  const inputRef = useRef(null);

  // ── Fetch predictions from Geoapify ────────────────────────────────────────
  const fetchPredictions = useCallback(async (value) => {
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    try {
    const res = await fetch(
      `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
        value
      )}&limit=5&filter=countrycode:in&bias=countrycode:in&apiKey=${import.meta.env.VITE_GEOAPIFY_API_KEY}`
    );

      const data = await res.json();

      if (data.features?.length) {
        setSuggestions(data.features);
        setShowDropdown(true);
        setHighlightedIdx(-1);
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    } catch (err) {
      console.error('Geoapify fetch failed:', err);
      setSuggestions([]);
      setShowDropdown(false);
    }
  }, []);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => fetchPredictions(input), 300);
    return () => clearTimeout(timer);
  }, [input, fetchPredictions]);

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
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  // ── Theme tokens ───────────────────────────────────────────────────────────
  const t = {
    wrapperBorder: disabled
      ? (dark ? '#1e293b' : '#e2e8f0')
      : isFocused
        ? '#3b82f6'
        : (dark ? '#334155' : '#e2e8f0'),
    wrapperBg: disabled
      ? (dark ? '#1e293b' : '#f1f5f9')
      : (dark ? '#0f172a' : '#ffffff'),
    wrapperShadow: isFocused && !disabled
      ? '0 0 0 3px rgba(59,130,246,0.15)'
      : 'none',
    inputColor: dark ? '#e2e8f0' : '#1e293b',
    placeholderColor: dark ? '#475569' : '#94a3b8',
    iconColor: isFocused ? '#3b82f6' : (dark ? '#475569' : '#94a3b8'),
    dropdownBg: dark ? '#1e293b' : '#ffffff',
    dropdownBorder: dark ? '#334155' : '#e2e8f0',
    dropdownShadow: dark
      ? '0 16px 40px rgba(0,0,0,0.5)'
      : '0 16px 40px rgba(0,0,0,0.12)',
    clearColor: dark ? '#475569' : '#94a3b8',
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* ── Input wrapper ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        backgroundColor: t.wrapperBg,
        border: `1.5px solid ${t.wrapperBorder}`,
        borderRadius: '12px', padding: '0 14px',
        transition: 'border-color 0.2s, box-shadow 0.2s, background-color 0.3s',
        boxShadow: t.wrapperShadow,
      }}>
        <Search size={16} color={t.iconColor} style={{ flexShrink: 0, transition: 'color 0.2s' }} />

        <input
          ref={inputRef}
          value={input}
          disabled={disabled || !isLoaded}
          placeholder={
            disabled
              ? 'Limit reached (15/15)'
              : !isLoaded
                ? 'Loading…'
                : 'Search places & landmarks…'
          }
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          onBlur={() => {
            setIsFocused(false);
            setTimeout(() => setShowDropdown(false), 150);
          }}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: '14px', padding: '11px 0', color: t.inputColor,
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />

        {/* Clear button */}
        {input.length > 0 && !disabled && (
          <button
            onMouseDown={(e) => { e.preventDefault(); clearInput(); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '2px', display: 'flex', alignItems: 'center',
              color: t.clearColor, flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Suggestions dropdown ── */}
      {showDropdown && suggestions.length > 0 && (
        <ul style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          backgroundColor: t.dropdownBg,
          border: `1px solid ${t.dropdownBorder}`,
          borderRadius: '14px',
          boxShadow: t.dropdownShadow,
          listStyle: 'none', padding: '6px 0', margin: 0,
          zIndex: 2000, overflow: 'hidden',
          animation: 'dropIn 0.15s ease',
        }}>
          {suggestions.map((s, i) => (
            <SuggestionItem
              key={`${s.properties.lat}-${s.properties.lon}-${i}`}
              suggestion={s}
              onSelect={handleSelect}
              dark={dark}
              isHighlighted={i === highlightedIdx}
            />
          ))}
        </ul>
      )}

      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default SearchBar;