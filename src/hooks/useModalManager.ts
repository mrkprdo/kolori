import { useState, useCallback } from "react";

type ModalSource = "main" | "settings";

export interface UseModalManagerReturn {
  // Scan Network Modal
  showScanNetworkModal: boolean;
  scanModalOpenedFrom: ModalSource;
  openScanModalFromMain: () => void;
  openScanModalFromSettings: () => void;
  closeScanModal: () => void;

  // Add Device Manually Modal
  showAddManuallyModal: boolean;
  addModalOpenedFrom: ModalSource;
  openAddManuallyModalFromMain: () => void;
  openAddManuallyModalFromSettings: () => void;
  closeAddManuallyModal: () => void;

  // Settings Modal
  showSettings: boolean;
  openSettings: () => void;
  closeSettings: () => void;

  // Child Modal States (from PresetGrid, etc.)
  childModalStates: Record<string, boolean>;
  updateChildModalState: (modalName: string, isOpen: boolean) => void;

  // Derived States
  isAnyModalOpen: boolean;
  isCustomEffectsModalOpen: boolean;
}

/**
 * Custom hook to manage all modal states and their interactions
 */
export function useModalManager(): UseModalManagerReturn {
  // Scan Network Modal
  const [showScanNetworkModal, setShowScanNetworkModal] = useState(false);
  const [scanModalOpenedFrom, setScanModalOpenedFrom] =
    useState<ModalSource>("main");

  // Add Device Manually Modal
  const [showAddManuallyModal, setShowAddManuallyModal] = useState(false);
  const [addModalOpenedFrom, setAddModalOpenedFrom] =
    useState<ModalSource>("main");

  // Settings Modal
  const [showSettings, setShowSettings] = useState(false);

  // Child Modal States (reported by child components)
  const [childModalStates, setChildModalStates] = useState<
    Record<string, boolean>
  >({});

  // Derived States
  const isAnyModalOpen =
    showScanNetworkModal ||
    showSettings ||
    showAddManuallyModal ||
    Object.values(childModalStates).some((isOpen) => isOpen);

  const isCustomEffectsModalOpen =
    childModalStates.showCustomEffectsModal || false;

  /**
   * Scan Network Modal Handlers
   */
  const openScanModalFromMain = useCallback(() => {
    setScanModalOpenedFrom("main");
    setShowScanNetworkModal(true);
  }, []);

  const openScanModalFromSettings = useCallback(() => {
    setShowSettings(false);
    setScanModalOpenedFrom("settings");
    setShowScanNetworkModal(true);
  }, []);

  const closeScanModal = useCallback(() => {
    setShowScanNetworkModal(false);
    // Reopen settings if scan was opened from there
    if (scanModalOpenedFrom === "settings") {
      setShowSettings(true);
    }
  }, [scanModalOpenedFrom]);

  /**
   * Add Device Manually Modal Handlers
   */
  const openAddManuallyModalFromMain = useCallback(() => {
    setAddModalOpenedFrom("main");
    setShowAddManuallyModal(true);
  }, []);

  const openAddManuallyModalFromSettings = useCallback(() => {
    setShowSettings(false);
    setAddModalOpenedFrom("settings");
    setShowAddManuallyModal(true);
  }, []);

  const closeAddManuallyModal = useCallback(() => {
    setShowAddManuallyModal(false);
    // Reopen settings if add modal was opened from there
    if (addModalOpenedFrom === "settings") {
      setShowSettings(true);
    }
  }, [addModalOpenedFrom]);

  /**
   * Settings Modal Handlers
   */
  const openSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const closeSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  /**
   * Child Modal State Handler
   */
  const updateChildModalState = useCallback(
    (modalName: string, isOpen: boolean) => {
      setChildModalStates((prev) => ({
        ...prev,
        [modalName]: isOpen,
      }));
    },
    []
  );

  return {
    // Scan Network Modal
    showScanNetworkModal,
    scanModalOpenedFrom,
    openScanModalFromMain,
    openScanModalFromSettings,
    closeScanModal,

    // Add Device Manually Modal
    showAddManuallyModal,
    addModalOpenedFrom,
    openAddManuallyModalFromMain,
    openAddManuallyModalFromSettings,
    closeAddManuallyModal,

    // Settings Modal
    showSettings,
    openSettings,
    closeSettings,

    // Child Modal States
    childModalStates,
    updateChildModalState,

    // Derived States
    isAnyModalOpen,
    isCustomEffectsModalOpen,
  };
}
