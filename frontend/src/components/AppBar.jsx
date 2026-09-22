import React from 'react';
import ThemeToggle from './ThemeToggle';
import AuthMenu from './AuthMenu';

/**
 * Top bar shared by every signed-in screen.
 * `left`, `center` and `right` are slots; the theme toggle and account menu are always appended.
 */
const AppBar = ({ left, center, right, showAccount = true }) => (
  <header className="appbar">
    <div className="appbar-left">{left}</div>
    <div className="appbar-center">{center}</div>
    <div className="appbar-right">
      {right}
      <ThemeToggle />
      {showAccount && <AuthMenu />}
    </div>
  </header>
);

export default AppBar;
