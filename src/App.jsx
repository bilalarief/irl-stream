import { useState, useEffect, useCallback } from 'react';
import SaweriaAlert from './SaweriaAlert';

function App() {
  const [config, setConfig] = useState({
    vdoNinja: '',
    chat: '',
    saweriaStreamKey: ''
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const [isAlertActive, setIsAlertActive] = useState(false);

  const handleAlertStart = useCallback(() => setIsAlertActive(true), []);
  const handleAlertEnd = useCallback(() => setIsAlertActive(false), []);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('irl_overlay_config');
    if (saved) {
      setConfig(JSON.parse(saved));
      setIsConfigured(true);
    }
  }, []);

  // Global hotkey for triggering alert fade manually (Stream Deck friendly)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        setIsAlertActive(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('irl_overlay_config', JSON.stringify(config));
    setIsConfigured(true);
  };

  const handleReset = () => {
    setIsConfigured(false);
  };

  // Extract stream key from a Saweria URL or use it directly
  const getStreamKey = (input) => {
    if (!input) return '';
    // If user pastes a full URL like https://saweria.co/widgets/alert?streamKey=abc123
    try {
      const url = new URL(input);
      const key = url.searchParams.get('streamKey');
      if (key) return key;
    } catch { }
    // Otherwise assume it's already a stream key
    return input;
  };

  const streamKey = getStreamKey(config.saweriaStreamKey);

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white p-4">
        <form onSubmit={handleSave} className="bg-neutral-800 p-8 rounded-xl shadow-2xl max-w-md w-full space-y-6 border border-neutral-700">
          <h1 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-red-500 to-amber-500 bg-clip-text text-transparent">
            IRL Stream Setup
          </h1>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">VDO.Ninja URL (Camera)</label>
            <input
              type="url"
              required
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              placeholder="https://vdo.ninja/?view=..."
              value={config.vdoNinja}
              onChange={(e) => setConfig({ ...config, vdoNinja: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">Combined Chat URL</label>
            <input
              type="url"
              required
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              placeholder="https://chat-url..."
              value={config.chat}
              onChange={(e) => setConfig({ ...config, chat: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">Saweria Stream Key or Alert URL</label>
            <input
              type="text"
              required
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              placeholder="abc123... or https://saweria.co/widgets/alert?streamKey=..."
              value={config.saweriaStreamKey}
              onChange={(e) => setConfig({ ...config, saweriaStreamKey: e.target.value })}
            />
            <p className="text-xs text-neutral-500">Paste your full Saweria alert URL or just the stream key</p>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-blue-500/30"
          >
            Launch Dashboard
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-black flex flex-row">
      {/* Settings toggle - hover upper left to see */}
      <div className="absolute top-4 left-4 z-50 opacity-0 hover:opacity-100 transition-opacity">
        <button
          onClick={handleReset}
          className="bg-black/50 hover:bg-black/80 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10 text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Settings
        </button>
        <button
          onClick={() => setIsAlertActive(!isAlertActive)}
          className={`mt-2 px-4 py-2 rounded-lg backdrop-blur-sm border text-sm flex items-center gap-2 ${isAlertActive ? 'bg-red-500/50 border-red-500/50 text-white' : 'bg-black/50 border-white/10 text-white/70'} hover:bg-black/80 transition-colors pointer-events-auto`}
        >
          Toggle Fake Alert (Test Fade)
        </button>
      </div>

      {/* Left Panel: Camera (VDO.Ninja) */}
      <div className="flex-1 h-full relative border-r border-neutral-800">
        {config.vdoNinja ? (
          <iframe
            src={config.vdoNinja}
            className="w-full h-full object-cover"
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            title="VDO.Ninja Camera"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500 gap-4">
            <svg className="w-16 h-16 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            <p>VDO.Ninja feed not configured</p>
          </div>
        )}
      </div>

      {/* Right Panel: Chat & Saweria Alert */}
      <div className="w-[400px] h-full relative bg-neutral-900 flex flex-col">

        {/* Chat Layer */}
        <div className={`absolute inset-0 z-10 transition-all duration-700 ease-in-out ${isAlertActive ? 'opacity-20 blur-sm scale-[0.98]' : 'opacity-100 blur-0 scale-100'}`}>
          {config.chat ? (
            <iframe
              src={config.chat}
              className="w-full h-full"
              title="Combined Chat"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-500">
              <p>Chat feed not configured</p>
            </div>
          )}
        </div>

        {/* Saweria Alert Layer (WebSocket-based, NO iframe!) */}
        <SaweriaAlert
          streamKey={streamKey}
          onAlertStart={handleAlertStart}
          onAlertEnd={handleAlertEnd}
        />

      </div>
    </div>
  );
}

export default App;
