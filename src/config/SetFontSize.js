import React, { useState } from "react";

function SetFontSize({ onChange }) {
  const [fontSize, setFontSize] = useState(16); // Default font size

  const handleChange = (e) => {
    const newSize = parseInt(e.target.value);
    setFontSize(newSize);
    onChange(newSize); // Pass the new font size to the parent component
  };

  return (
    <div>
      <label htmlFor="fontSize">Font Size:</label>
      <input
        type="number"
        id="fontSize"
        value={fontSize}
        onChange={handleChange}
      />
    </div>
  );
}

export default SetFontSize;
