import { useEffect, useState } from 'react';
import createjs from 'createjs-module';
import {
  NavigationArrow,
  OdometryClient,
  PathClient,
  PoseArrayClient,
  PoseStampedClient,
} from 'ros2d';
import { addMetricBackdrop, centerMetricView, createDemoRoot, createTfClient, disposeTfClient, removeDemoRoot } from '../lib/ros2dHelpers.js';

export function NavigationOverlayDemo({ ros, viewer }) {
  const [draft, setDraft] = useState({
    pathTopic: '/path',
    poseTopic: '/pose',
    odomTopic: '/odom',
    poseArrayTopic: '/particlecloud',
    fixedFrame: 'map',
    useTf: false,
  });
  const [settings, setSettings] = useState({
    pathTopic: '/path',
    poseTopic: '/pose',
    odomTopic: '/odom',
    poseArrayTopic: '/particlecloud',
    fixedFrame: 'map',
    useTf: false,
  });
  const [status, setStatus] = useState('Waiting for path and pose overlays');

  useEffect(() => {
    if (!ros || !viewer) {
      return undefined;
    }

    centerMetricView(viewer, 20, 14);
    const root = createDemoRoot(viewer);
    addMetricBackdrop(root, { extent: 10, spacing: 1 });

    const tfClient = settings.useTf ? createTfClient(ros, settings.fixedFrame) : null;
    const pathClient = new PathClient({
      ros,
      topic: settings.pathTopic,
      rootObject: root,
      tfClient,
      strokeSize: 0.05,
      strokeColor: '#4069c7',
    });
    const poseClient = new PoseStampedClient({
      ros,
      topic: settings.poseTopic,
      rootObject: root,
      tfClient,
      shape: new NavigationArrow({
        size: 0.7,
        fillColor: createjs.Graphics.getRGB(33, 148, 88),
      }),
    });
    const odomClient = new OdometryClient({
      ros,
      topic: settings.odomTopic,
      rootObject: root,
      tfClient,
      shape: new NavigationArrow({
        size: 0.55,
        fillColor: createjs.Graphics.getRGB(211, 111, 46),
      }),
    });
    const poseArrayClient = new PoseArrayClient({
      ros,
      topic: settings.poseArrayTopic,
      rootObject: root,
      tfClient,
      size: 0.18,
      fillColor: createjs.Graphics.getRGB(125, 64, 188, 0.45),
      strokeSize: 0,
    });

    const handleChange = () => {
      setStatus('Navigation overlays updated');
    };

    pathClient.on('change', handleChange);
    poseClient.on('change', handleChange);
    odomClient.on('change', handleChange);
    poseArrayClient.on('change', handleChange);

    return () => {
      pathClient.off('change', handleChange);
      poseClient.off('change', handleChange);
      odomClient.off('change', handleChange);
      poseArrayClient.off('change', handleChange);
      pathClient.unsubscribe();
      poseClient.unsubscribe();
      odomClient.unsubscribe();
      poseArrayClient.unsubscribe();
      disposeTfClient(tfClient);
      removeDemoRoot(viewer, root);
    };
  }, [ros, settings, viewer]);

  return (
    <div className="demo-card">
      <div className="demo-copy">
        <p className="eyebrow">Navigation</p>
        <h3>Path, Pose, Odometry, PoseArray</h3>
        <p>
          Compose multiple overlays in one scene to mirror the most common RViz 2D
          navigation layout.
        </p>
      </div>

      <div className="control-grid">
        <label className="field">
          <span>Path topic</span>
          <input
            value={draft.pathTopic}
            onChange={(event) => setDraft({ ...draft, pathTopic: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Pose topic</span>
          <input
            value={draft.poseTopic}
            onChange={(event) => setDraft({ ...draft, poseTopic: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Odometry topic</span>
          <input
            value={draft.odomTopic}
            onChange={(event) => setDraft({ ...draft, odomTopic: event.target.value })}
          />
        </label>
        <label className="field">
          <span>PoseArray topic</span>
          <input
            value={draft.poseArrayTopic}
            onChange={(event) => setDraft({ ...draft, poseArrayTopic: event.target.value })}
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
        <button className="primary-button" onClick={() => setSettings({ ...draft })}>
          Apply
        </button>
      </div>

      <p className="helper-text">{status}</p>
    </div>
  );
}
