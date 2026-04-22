import { useEffect, useState } from 'react';
import { ImageMapClient } from 'ros2d';
import { createDemoRoot, fitMapView, removeDemoRoot } from '../lib/ros2dHelpers.js';

export function ImageMapDemo({ viewer }) {
  const [draftYaml, setDraftYaml] = useState('/sample-map.yaml');
  const [yaml, setYaml] = useState('/sample-map.yaml');
  const [status, setStatus] = useState('Load a map_server-style YAML asset');

  useEffect(() => {
    if (!viewer || !yaml) {
      return undefined;
    }

    const root = createDemoRoot(viewer);
    const client = new ImageMapClient({
      yaml,
      rootObject: root,
    });

    const handleChange = () => {
      fitMapView(viewer, client.currentImage);
      setStatus(`Asset loaded from ${yaml}`);
    };
    const handleError = (error) => {
      setStatus(error && error.message ? error.message : 'Image asset failed to load');
    };

    client.on('change', handleChange);
    client.on('error', handleError);

    return () => {
      client.off('change', handleChange);
      client.off('error', handleError);
      removeDemoRoot(viewer, root);
    };
  }, [viewer, yaml]);

  return (
    <div className="demo-card">
      <div className="demo-copy">
        <p className="eyebrow">Assets</p>
        <h3>ImageMapClient</h3>
        <p>
          Load a `map.yaml` file and the referenced image asset without a ROS topic.
          The sample uses a bundled SVG map so the demo works immediately.
        </p>
      </div>

      <div className="control-grid">
        <label className="field field-wide">
          <span>YAML URL</span>
          <input value={draftYaml} onChange={(event) => setDraftYaml(event.target.value)} />
        </label>
      </div>

      <div className="button-row">
        <button className="primary-button" onClick={() => setYaml(draftYaml)}>
          Load Asset
        </button>
      </div>

      <p className="helper-text">{status}</p>
    </div>
  );
}
