import { useEffect, useState } from 'react';
import api from '../services/api';

export function useApiHealth(pollMs = 30000) {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let mounted = true;
    let timerId;

    const check = async () => {
      try {
        await api.get('/health/ready', { timeout: 6000 });
        if (mounted) setStatus('online');
      } catch {
        if (mounted) setStatus('degraded');
      } finally {
        if (mounted) {
          timerId = window.setTimeout(check, pollMs);
        }
      }
    };

    check();
    return () => {
      mounted = false;
      if (timerId) window.clearTimeout(timerId);
    };
  }, [pollMs]);

  return status;
}
