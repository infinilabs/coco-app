import React from 'react'
import ReactDOM from 'react-dom/client'
import { readDir } from 'coco-api/fs';

const ReadDesktopButton = () => {
  const [path, setPath] = React.useState('/Users/steve/Desktop');
  const [entries, setEntries] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  const handleReadDesktop = async () => {
    console.log("DBG: button clicked");
    setLoading(true);

    try {
      const result = await readDir(path);
      setEntries(result);
    } catch (error) {
      console.error('DBG: Error reading directory:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '10px' }}>
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="Enter directory path"
          style={{ 
            padding: '8px', 
            marginRight: '10px', 
            width: '300px',
            fontSize: '14px'
          }}
        />
        <button onClick={handleReadDesktop} disabled={loading}>
          {loading ? 'Reading...' : 'Read Directory'}
        </button>
      </div>
      
      {entries.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>Entries in "{path}":</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {entries.map((entry, index) => (
              <li key={index} style={{ padding: '4px 0', borderBottom: '1px solid #eee' }}>
                {entry}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ReadDesktopButton />
  </React.StrictMode>,
)