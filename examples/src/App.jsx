import { useState } from 'react';
import { ConnectionPanel } from './components/ConnectionPanel.jsx';
import { ViewerStage } from './components/ViewerStage.jsx';
import { useRosConnection } from './hooks/useRosConnection.js';
import { OccupancyGridDemo } from './demos/OccupancyGridDemo.jsx';
import { ImageMapDemo } from './demos/ImageMapDemo.jsx';
import { MarkerArrayDemo } from './demos/MarkerArrayDemo.jsx';
import { LaserScanDemo } from './demos/LaserScanDemo.jsx';
import { NavigationOverlayDemo } from './demos/NavigationOverlayDemo.jsx';

const DEMOS = [
  {
    key: 'occupancy-grid',
    label: 'OccupancyGridClient',
    summary: 'Live occupancy grid subscription with automatic viewer fitting.',
    render: (props) => <OccupancyGridDemo {...props} />,
  },
  {
    key: 'image-map',
    label: 'ImageMapClient',
    summary: 'Load a map.yaml asset directly in the browser without ROS topics.',
    render: (props) => <ImageMapDemo {...props} />,
  },
  {
    key: 'markers',
    label: 'MarkerArrayClient',
    summary: 'Overlay 2D projections of RViz markers on a metric backdrop.',
    render: (props) => <MarkerArrayDemo {...props} />,
  },
  {
    key: 'laser-scan',
    label: 'LaserScanClient',
    summary: 'Render a lidar scan as 2D hit points, with optional TF support.',
    render: (props) => <LaserScanDemo {...props} />,
  },
  {
    key: 'navigation',
    label: 'Navigation Overlays',
    summary: 'Compose path, pose, odometry, and particle cloud overlays together.',
    render: (props) => <NavigationOverlayDemo {...props} />,
  },
];

export default function App() {
  const [viewer, setViewer] = useState(null);
  const [activeDemoKey, setActiveDemoKey] = useState('occupancy-grid');
  const {
    ros,
    status,
    draftUrl,
    setDraftUrl,
    connect,
    disconnect,
    lastError,
  } = useRosConnection('ws://localhost:9090');

  const activeDemo = DEMOS.find((demo) => demo.key === activeDemoKey) || DEMOS[0];

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <header className="hero-panel">
          <p className="eyebrow">ros2djs-ros2</p>
          <h1>React Example Studio</h1>
          <p>
            A current, React-first example app for the modern ROS 2D visualization
            API surface.
          </p>
        </header>

        <ConnectionPanel
          status={status}
          draftUrl={draftUrl}
          setDraftUrl={setDraftUrl}
          connect={connect}
          disconnect={disconnect}
          lastError={lastError}
        />

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Demos</p>
              <h2>Example Set</h2>
            </div>
          </div>

          <div className="demo-list">
            {DEMOS.map((demo) => (
              <button
                key={demo.key}
                className={`demo-list-item ${demo.key === activeDemoKey ? 'active' : ''}`}
                onClick={() => setActiveDemoKey(demo.key)}
              >
                <span>{demo.label}</span>
                <small>{demo.summary}</small>
              </button>
            ))}
          </div>
        </section>
      </aside>

      <main className="app-main">
        <section className="workspace-header">
          <div>
            <p className="eyebrow">Active Demo</p>
            <h2>{activeDemo.label}</h2>
            <p>{activeDemo.summary}</p>
          </div>
        </section>

        {activeDemo.render({ ros, viewer })}

        <ViewerStage setViewer={setViewer} />
      </main>
    </div>
  );
}
