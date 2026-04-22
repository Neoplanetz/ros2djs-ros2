import { useEffect, useState } from 'react';
import * as ROSLIB from 'roslib';

export function useRosConnection(initialUrl) {
  const [draftUrl, setDraftUrl] = useState(initialUrl);
  const [request, setRequest] = useState({ url: initialUrl, nonce: 1 });
  const [ros, setRos] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [lastError, setLastError] = useState('');

  useEffect(() => {
    if (!request.nonce) {
      return undefined;
    }

    const nextRos = new ROSLIB.Ros({ url: request.url });
    setRos(nextRos);
    setStatus('connecting');
    setLastError('');

    const handleConnection = () => {
      setStatus('connected');
      setLastError('');
    };
    const handleClose = () => {
      setStatus('closed');
    };
    const handleError = (error) => {
      setStatus('error');
      setLastError(error && error.message ? error.message : 'Unknown rosbridge error');
    };

    nextRos.on('connection', handleConnection);
    nextRos.on('close', handleClose);
    nextRos.on('error', handleError);

    return () => {
      nextRos.close();
    };
  }, [request]);

  return {
    ros,
    status,
    draftUrl,
    setDraftUrl,
    lastError,
    connect() {
      setRequest({ url: draftUrl, nonce: Date.now() });
    },
    disconnect() {
      if (ros) {
        ros.close();
      }
    },
  };
}
