'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'cdc-guide-dismissed';
const STORAGE_OPEN_KEY = 'cdc-guide-open';
export const GUIDE_VERSION_KEY = 'cdc-guide-version';
export const GUIDE_VERSION = '2026-04-procurement-simplified';

interface GuideState {
  isOpen: boolean;
  dismissed: boolean;
}

let guideState: GuideState = {
  isOpen: false,
  dismissed: true,
};

const listeners = new Set<(state: GuideState) => void>();

function setGuideState(nextState: Partial<GuideState>) {
  guideState = { ...guideState, ...nextState };
  listeners.forEach((listener) => listener(guideState));
}

export function useFeatureGuide() {
  const [{ isOpen, dismissed }, setState] = useState(guideState);

  useEffect(() => {
    const listener = (nextState: GuideState) => setState(nextState);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    const storedVersion = localStorage.getItem(GUIDE_VERSION_KEY);
    const isCurrentVersion = storedVersion === GUIDE_VERSION;
    const isDismissed = localStorage.getItem(STORAGE_KEY) === 'true';

    setGuideState({
      dismissed: isDismissed && isCurrentVersion,
      isOpen: !isCurrentVersion,
    });
  }, []);

  const openGuide = useCallback(() => {
    setGuideState({ isOpen: true });
  }, []);

  const closeGuide = useCallback(() => {
    setGuideState({ isOpen: false });
  }, []);

  const dismissForever = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    localStorage.setItem(GUIDE_VERSION_KEY, GUIDE_VERSION);
    setGuideState({ dismissed: true, isOpen: false });
  }, []);

  const completeGuide = useCallback(() => {
    localStorage.setItem(GUIDE_VERSION_KEY, GUIDE_VERSION);
    setGuideState({ dismissed: false, isOpen: false });
  }, []);

  const resetGuide = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_OPEN_KEY);
    localStorage.removeItem(GUIDE_VERSION_KEY);
    setGuideState({ dismissed: false, isOpen: true });
  }, []);

  return {
    isOpen,
    dismissed,
    openGuide,
    closeGuide,
    dismissForever,
    completeGuide,
    resetGuide,
  };
}
