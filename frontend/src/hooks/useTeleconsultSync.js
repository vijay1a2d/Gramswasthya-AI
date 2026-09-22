import { useState, useEffect, useCallback } from 'react';

// Key used in localStorage for the teleconsultation state
const SYNC_KEY = 'gs_teleconsult_state';

// Initial state structure
const INITIAL_STATE = {
  callStatus: 'idle', // 'idle', 'requested', 'active'
  patientRequest: null, // { id: '...', name: '...', time: '...' }
  messages: [], // [{ id, sender: 'Doctor'|'Patient', text, time }]
};

export function useTeleconsultSync() {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(SYNC_KEY);
      return stored ? JSON.parse(stored) : INITIAL_STATE;
    } catch {
      return INITIAL_STATE;
    }
  });

  // Sync with localStorage changes from other tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === SYNC_KEY && e.newValue) {
        setState(JSON.parse(e.newValue));
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Update both local state and localStorage
  const updateState = useCallback((updater) => {
    setState((prev) => {
      const nextState = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem(SYNC_KEY, JSON.stringify(nextState));
      return nextState;
    });
  }, []);

  const requestCall = useCallback((patientInfo) => {
    updateState(prev => ({
      ...prev,
      callStatus: 'requested',
      patientRequest: {
        ...patientInfo,
        id: Date.now().toString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      messages: [] // Clear old messages on new request
    }));
  }, [updateState]);

  const acceptCall = useCallback(() => {
    updateState(prev => ({
      ...prev,
      callStatus: 'active'
    }));
  }, [updateState]);

  const endCall = useCallback(() => {
    updateState(INITIAL_STATE);
  }, [updateState]);

  const sendMessage = useCallback((sender, text) => {
    updateState(prev => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          id: Date.now().toString(),
          sender,
          text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    }));
  }, [updateState]);

  return {
    ...state,
    requestCall,
    acceptCall,
    endCall,
    sendMessage,
    updateState // exposing raw update for any edge cases
  };
}
