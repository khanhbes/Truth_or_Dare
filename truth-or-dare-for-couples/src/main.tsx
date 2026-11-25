import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      fallback={(
        <div className="grid min-h-screen place-items-center bg-[#12090f] px-4 text-center text-white">
          <div className="max-w-sm">
            <h1 className="font-serif-romantic text-2xl font-bold">Trang gặp trục trặc</h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-300">
              Ván đang chơi và lá đã mở vẫn được giữ trên máy. Tải lại trang để tiếp tục.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 min-h-11 rounded-full bg-gold-gradient px-6 text-sm font-bold text-neutral-950"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      )}
    >
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
