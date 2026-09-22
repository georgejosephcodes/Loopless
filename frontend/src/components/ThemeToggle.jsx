import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../ThemeContext';

const ThemeToggle = () => {
  const { dark, toggle } = useTheme();
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button type="button" className="icon-btn" onClick={toggle} title={label} aria-label={label}>
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

export default ThemeToggle;
