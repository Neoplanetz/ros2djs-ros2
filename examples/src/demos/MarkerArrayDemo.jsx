import { useEffect, useState } from 'react';
import { MarkerArrayClient } from 'ros2-web2d';
import { addMetricBackdrop, centerMetricView, createDemoRoot, removeDemoRoot } from '../lib/ros2dHelpers.js';

export function MarkerArrayDemo({ ros, viewer }) {
  const [draftTopic, setDraftTopic] = useState('/markers');
  const [topic, setTopic] = useState('/markers');
  const [status, setStatus] = useState('Waiting for marker arrays');

  useEffect(() => {
    if (!ros || !viewer) {
      return undefined;
    }

    centerMetricView(viewer, 18, 12);
    const root = createDemoRoot(viewer);
    addMetricBackdrop(root, { extent: 9, spacing: 1 });

    const client = new MarkerArrayClient({
      ros,
      topic,
      rootObject: root,
    });

    const handleChange = () => {
      setStatus(`Latest MarkerArray rendered from ${topic}`);
    };

    client.on('change', handleChange);

    return () => {
      client.off('change', handleChange);
      client.unsubscribe();
      removeDemoRoot(viewer, root);
    };
  }, [ros, topic, viewer]);

  return (
    <div className="demo-card">
      <div className="demo-copy">
        <p className="eyebrow">Markers</p>
        <h3>MarkerArrayClient</h3>
        <p>
          Overlay 2D projections of RViz markers, including arrows, shapes,
          text, and triangle lists.
        </p>
      </div>

      <div className="control-grid">
        <label className="field">
          <span>Topic</span>
          <input value={draftTopic} onChange={(event) => setDraftTopic(event.target.value)} />
        </label>
      </div>

      <div className="button-row">
        <button className="primary-button" onClick={() => setTopic(draftTopic)}>
          Apply
        </button>
      </div>

      <p className="helper-text">{status}</p>
    </div>
  );
}
