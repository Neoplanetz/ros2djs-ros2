import { useEffect, useState } from 'react';
import { LaserScanClient } from 'ros2d';
import { addMetricBackdrop, centerMetricView, createDemoRoot, createTfClient, disposeTfClient, removeDemoRoot } from '../lib/ros2dHelpers.js';

export function LaserScanDemo({ ros, viewer }) {
  const [draft, setDraft] = useState({
    topic: '/scan',
    pointSize: '0.04',
    sampleStep: '1',
    maxRange: '',
    fixedFrame: 'map',
    useTf: false,
  });
  const [settings, setSettings] = useState({
    topic: '/scan',
    pointSize: 0.04,
    sampleStep: 1,
    maxRange: null,
    fixedFrame: 'map',
    useTf: false,
  });
  const [status, setStatus] = useState('Waiting for LaserScan data');

  useEffect(() => {
    if (!ros || !viewer) {
      return undefined;
    }

    centerMetricView(viewer, 18, 12);
    const root = createDemoRoot(viewer);
    addMetricBackdrop(root, { extent: 9, spacing: 1 });

    const tfClient = settings.useTf ? createTfClient(ros, settings.fixedFrame) : null;
    const client = new LaserScanClient({
      ros,
      topic: settings.topic,
      rootObject: root,
      tfClient,
      pointSize: settings.pointSize,
      sampleStep: settings.sampleStep,
      maxRange: settings.maxRange,
      pointColor: '#dd5333',
    });

    const handleChange = () => {
      setStatus(`LaserScan rendered from ${settings.topic}`);
    };

    client.on('change', handleChange);

    return () => {
      client.off('change', handleChange);
      client.unsubscribe();
      disposeTfClient(tfClient);
      removeDemoRoot(viewer, root);
    };
  }, [ros, settings, viewer]);

  return (
    <div className="demo-card">
      <div className="demo-copy">
        <p className="eyebrow">Sensors</p>
        <h3>LaserScanClient</h3>
        <p>
          Render a 2D lidar scan as hit points. Use TF when you want the scan frame
          aligned into a larger map view.
        </p>
      </div>

      <div className="control-grid">
        <label className="field">
          <span>Topic</span>
          <input
            value={draft.topic}
            onChange={(event) => setDraft({ ...draft, topic: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Point size</span>
          <input
            value={draft.pointSize}
            onChange={(event) => setDraft({ ...draft, pointSize: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Sample step</span>
          <input
            value={draft.sampleStep}
            onChange={(event) => setDraft({ ...draft, sampleStep: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Max range</span>
          <input
            value={draft.maxRange}
            onChange={(event) => setDraft({ ...draft, maxRange: event.target.value })}
            placeholder="optional"
          />
        </label>
        <label className="field">
          <span>Fixed frame</span>
          <input
            value={draft.fixedFrame}
            onChange={(event) => setDraft({ ...draft, fixedFrame: event.target.value })}
          />
        </label>
        <label className="toggle-field">
          <input
            type="checkbox"
            checked={draft.useTf}
            onChange={(event) => setDraft({ ...draft, useTf: event.target.checked })}
          />
          <span>Use TF</span>
        </label>
      </div>

      <div className="button-row">
        <button
          className="primary-button"
          onClick={() => setSettings({
            topic: draft.topic,
            pointSize: Number.parseFloat(draft.pointSize) || 0.04,
            sampleStep: Math.max(1, Number.parseInt(draft.sampleStep, 10) || 1),
            maxRange: draft.maxRange ? Number.parseFloat(draft.maxRange) : null,
            fixedFrame: draft.fixedFrame,
            useTf: draft.useTf,
          })}
        >
          Apply
        </button>
      </div>

      <p className="helper-text">{status}</p>
    </div>
  );
}
