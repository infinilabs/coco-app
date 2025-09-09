import React from 'react'
import ReactDOM from 'react-dom/client'
import { readdir } from 'coco-api/fs';

const ReadDesktopButton = () => {
  const handleReadDesktop = async () => {
    console.log("DBG: button clicked");

    try {
      const entries = await readdir('/Users/steve/Desktop');
      console.log(entries);

    } catch (error) {
      console.error('DBG: Error reading desktop directory:', error);
    }
  };

  return (
    <button onClick={handleReadDesktop}>
      Read Desktop Directory
    </button>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ReadDesktopButton />
  </React.StrictMode>,
)