import { useEffect, useId, useRef, useState } from 'react';
import { Viewer } from 'ros2d';

export function ViewerStage({ setViewer }) {
  const hostRef = useRef(null);
  const hostId = useId().replace(/:/g, '-');
  const [size, setSize] = useState(null);
  // Stash setViewer in a ref so the viewer-creation effect depends only on
  // hostId/size. Without this, strict mode + parent re-renders would
  // recreate the viewer on every render pass (noisy canvas warnings).
  const setViewerRef = useRef(setViewer);
  setViewerRef.current = setViewer;

  useEffect(() => {
    if (!hostRef.current || size) {
      return;
    }

    const bounds = hostRef.current.getBoundingClientRect();
    const width = Math.max(320, Math.min(Math.round(bounds.width || 880), 960));
    const height = Math.max(320, Math.round(width * 0.62));
    setSize({ width, height });
  }, [size]);

  useEffect(() => {
    if (!size) {
      return undefined;
    }

    const viewer = new Viewer({
      divID: hostId,
      width: size.width,
      height: size.height,
      background: '#f7f4ed',
    });
    setViewerRef.current(viewer);

    return () => {
      if (hostRef.current) {
        hostRef.current.innerHTML = '';
      }
      setViewerRef.current(null);
    };
  }, [hostId, size]);

  return (
    <div className="viewer-shell">
      <div ref={hostRef} id={hostId} className="viewer-canvas-host" />
    </div>
  );
}
