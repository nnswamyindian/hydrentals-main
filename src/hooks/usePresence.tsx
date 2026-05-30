import { useState, useCallback } from 'react';

interface PresenceState {
  isOnline: boolean;
  isTyping: boolean;
  lastSeen: string | null;
}

export const usePresence = (channelName: string, partnerId: string) => {
  const [partnerPresence, setPartnerPresence] = useState<PresenceState>({
    isOnline: true, // Always show online for demo local purposes
    isTyping: false,
    lastSeen: new Date().toISOString(),
  });

  const setTyping = useCallback((typing: boolean) => {
    // Typing state is purely local in an offline/polling mockup unless pushed to server
  }, []);

  return { partnerPresence, setTyping };
};
