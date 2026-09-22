import React from 'react';
import { Link } from 'react-router-dom';

const Logo = ({ to = '/' }) => (
  <Link to={to} className="logo" aria-label="Loopless home">
    <img src="/pic.svg" alt="" />
    <span>
      <span className="logo-a">Loop</span>less
    </span>
  </Link>
);

export default Logo;
