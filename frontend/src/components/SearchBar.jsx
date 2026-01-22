import React, { useState, useEffect } from "react";

const SearchBar = ({ onAdd, disabled }) => {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (input.trim().length < 3) return;

    const controller = new AbortController();
    const delayDebounce = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${input}&limit=5`,
          { signal: controller.signal }
        );

        const data = await response.json();
        setSuggestions(data || []);
        setShowDropdown(true);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Search error:", err);
        }
      }
    }, 500);

    return () => {
      controller.abort();
      clearTimeout(delayDebounce);
    };
  }, [input]);

  const handleChange = (e) => {
    const value = e.target.value;
    setInput(value);

    if (value.trim().length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const handleSelect = (place) => {
    onAdd({
      name: place.display_name.split(",")[0],
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
    });

    setInput("");
    setSuggestions([]);
    setShowDropdown(false);
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        value={input}
        disabled={disabled}
        placeholder={
          disabled ? "Limit reached (15/15)" : "Search shops or landmarks..."
        }
        onChange={handleChange}
        style={{
          width: "100%",
          padding: "12px 18px",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          fontSize: "15px",
          outline: "none",
          backgroundColor: disabled ? "#f1f5f9" : "white",
        }}
      />

      {showDropdown && suggestions.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: "55px",
            left: 0,
            right: 0,
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 10px 15px rgba(0,0,0,0.1)",
            listStyle: "none",
            padding: "10px 0",
            margin: 0,
            zIndex: 2000,
            border: "1px solid #e2e8f0",
          }}
        >
          {suggestions.map((place) => (
            <li
              key={place.place_id}
              onClick={() => handleSelect(place)}
              style={{
                padding: "10px 20px",
                cursor: "pointer",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: "14px" }}>
                {place.display_name.split(",")[0]}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#94a3b8",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {place.display_name}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
