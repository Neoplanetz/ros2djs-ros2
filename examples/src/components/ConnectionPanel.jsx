export function ConnectionPanel(props) {
  const {
    status,
    draftUrl,
    setDraftUrl,
    connect,
    disconnect,
    lastError,
  } = props;

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Rosbridge</p>
          <h2>Connection</h2>
        </div>
        <span className={`status-badge status-${status}`}>{status}</span>
      </div>

      <label className="field">
        <span>Websocket URL</span>
        <input
          type="text"
          value={draftUrl}
          onChange={(event) => setDraftUrl(event.target.value)}
          placeholder="ws://localhost:9090"
        />
      </label>

      <div className="button-row">
        <button className="primary-button" onClick={connect}>Connect</button>
        <button className="ghost-button" onClick={disconnect}>Disconnect</button>
      </div>

      <p className="helper-text">
        The ROS-backed demos use this connection. The ImageMap asset demo works without rosbridge.
      </p>

      {lastError ? <p className="error-text">{lastError}</p> : null}
    </section>
  );
}
