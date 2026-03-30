import React, { useState, useEffect } from "react";

const SearchBar = ({ onAdd, disabled, dark }) => {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const t = {
    inputBg: disabled ? (dark ? '#1e293b' : '#f1f5f9') : (dark ? '#0f172a' : 'white'),
    inputBorder: dark ? '#334155' : '#e2e8f0',
    inputColor: dark ? '#e2e8f0' : '#1e293b',
    dropdownBg: dark ? '#1e293b' : 'white',
    dropdownBorder: dark ? '#334155' : '#e2e8f0',
    dropdownShadow: dark ? '0 10px 15px rgba(0,0,0,0.4)' : '0 10px 15px rgba(0,0,0,0.1)',
    itemBorder: dark ? '#334155' : '#f1f5f9',
    itemTitle: dark ? '#e2e8f0' : '#1e293b',
    itemSub: dark ? '#475569' : '#94a3b8',
  };

  useEffect(() => {
    if (input.trim().length < 3) return;
    const controller = new AbortController();
    const delayDebounce = setTimeout(async () => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${input}&limit=5`, { signal: controller.signal });
        const data = await response.json();
        setSuggestions(data || []);
        setShowDropdown(true);
      } catch (err) {
        if (err.name !== "AbortError") console.error("Search error:", err);
      }
    }, 500);
    return () => { controller.abort(); clearTimeout(delayDebounce); };
  }, [input]);

  const handleChange = (e) => {
    const value = e.target.value;
    setInput(value);
    if (value.trim().length < 3) { setSuggestions([]); setShowDropdown(false); }
  };

  const handleSelect = (place) => {
    onAdd({ name: place.display_name.split(",")[0], lat: parseFloat(place.lat), lng: parseFloat(place.lon) });
    setInput(""); setSuggestions([]); setShowDropdown(false);
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        value={input}
        disabled={disabled}
        placeholder={disabled ? "Limit reached (15/15)" : "Search shops or landmarks..."}
        onChange={handleChange}
        style={{ width: "100%", padding: "12px 18px", borderRadius: "12px", border: `1px solid ${t.inputBorder}`, fontSize: "15px", outline: "none", backgroundColor: t.inputBg, color: t.inputColor, transition: 'background-color 0.3s', boxSizing: 'border-box' }}
      />
      {showDropdown && suggestions.length > 0 && (
        <ul style={{ position: "absolute", top: "55px", left: 0, right: 0, backgroundColor: t.dropdownBg, borderRadius: "12px", boxShadow: t.dropdownShadow, listStyle: "none", padding: "10px 0", margin: 0, zIndex: 2000, border: `1px solid ${t.dropdownBorder}` }}>
          {suggestions.map((place) => (
            <li key={place.place_id} onClick={() => handleSelect(place)} style={{ padding: "10px 20px", cursor: "pointer", borderBottom: `1px solid ${t.itemBorder}` }}>
              <div style={{ fontWeight: 600, fontSize: "14px", color: t.itemTitle }}>{place.display_name.split(",")[0]}</div>
              <div style={{ fontSize: "11px", color: t.itemSub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{place.display_name}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;