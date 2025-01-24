import React, { createContext, useState, useEffect, useContext } from 'react';

const FontSizeContext = createContext();

export const FontSizeProvider = ({ children }) => {
  const [fontSize, setFontSize] = useState(() => {
    return parseInt(localStorage.getItem('fontSize')) || 16;
  });

  const increaseFontSize = () => {
    setFontSize(prevSize => prevSize + 1);
  };

  const decreaseFontSize = () => {
    setFontSize(prevSize => prevSize - 1);
  };

  useEffect(() => {
    localStorage.setItem('fontSize', fontSize);
  }, [fontSize]);

  const value = {
    fontSize,
    increaseFontSize,
    decreaseFontSize
  };

  return (
    <FontSizeContext.Provider value={value}>
      {children}
    </FontSizeContext.Provider>
  );
};

export const useFontSize = () => useContext(FontSizeContext);