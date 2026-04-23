import { useEffect, useState } from 'react';
import { OccupancyGridClient } from 'ros2d';
import {
  addMetricBackdrop,
  createDemoRoot,
  createInitialMapViewFitter,
  removeDemoRoot,
} from '../lib/ros2dHelpers.js';

export function OccupancyGridDemo({ ros, viewer }) {
  const [draftTopic, setDraftTopic] = useState('/map');
  const [draftContinuous, setDraftContinuous] = useState(true);
  const [settings, setSettings] = useState({ topic: '/map', continuous: true });
  const [status, setStatus] = useState('Waiting for map data');

  useEffect(() => {
    if (!ros || !viewer) {
      return undefined;
    }

    const root = createDemoRoot(viewer);
    const overlayRoot = createDemoRoot(viewer);
    addMetricBackdrop(overlayRoot, { extent: 24, spacing: 1 });
    const fitInitialMapView = createInitialMapViewFitter(viewer);
    const client = new OccupancyGridClient({
      ros,
      topic: settings.topic,
      continuous: settings.continuous,
      rootObject: root,
    });

    const handleChange = () => {
      fitInitialMapView(client.currentGrid);
      setStatus(`Map ready from ${settings.topic}`);
    };

    client.on('change', handleChange);

    return () => {
      client.off('change', handleChange);
      client.unsubscribe();
      removeDemoRoot(viewer, root);
      removeDemoRoot(viewer, overlayRoot);
    };
  }, [ros, settings, viewer]);

  return (
    <div className="demo-card">
      <div className="demo-copy">
        <p className="eyebrow">Map</p>
        <h3>OccupancyGridClient</h3>
        <p>
          Subscribe to a live `nav_msgs/OccupancyGrid` topic and fit the viewer
          when the first map arrives.
        </p>
      </div>

      <div className="control-grid">
        <label className="field">
          <span>Topic</span>
          <input value={draftTopic} onChange={(event) => setDraftTopic(event.target.value)} />
        </label>
        <label className="toggle-field">
          <input
            type="checkbox"
            checked={draftContinuous}
            onChange={(event) => setDraftContinuous(event.target.checked)}
          />
          <span>Continuous updates</span>
        </label>
      </div>

      <div className="button-row">
        <button
          className="primary-button"
          onClick={() => setSettings({ topic: draftTopic, continuous: draftContinuous })}
        >
          Apply
        </button>
      </div>

      <p className="helper-text">{status}</p>
    </div>
  );
}
