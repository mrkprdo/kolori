/**
 * WLED Configuration Checker
 *
 * Verifies if WLED device is properly configured for UDP Realtime control
 */

import { logger } from './logger';

export interface WLEDConfigStatus {
  isReady: boolean;
  hasAudioReactive: boolean;
  udpSyncEnabled: boolean;
  udpRealtimeEnabled: boolean;
  realtimePort: number | null;
  audioSource: string | null;
  currentEffect: string | null;
  isAudioReactiveEffect: boolean;
  issues: string[];
}

/**
 * Check if WLED device is configured for UDP Realtime control
 */
export async function checkWLEDAudioReactiveConfig(deviceIp: string, expectedPort: number = 21324): Promise<WLEDConfigStatus> {
  const status: WLEDConfigStatus = {
    isReady: false,
    hasAudioReactive: false,
    udpSyncEnabled: false,
    udpRealtimeEnabled: false,
    realtimePort: null,
    audioSource: null,
    currentEffect: null,
    isAudioReactiveEffect: false,
    issues: [],
  };

  try {
    // Fetch WLED config and state
    const configResponse = await fetch(`http://${deviceIp}/json/cfg`);
    const stateResponse = await fetch(`http://${deviceIp}/json/state`);
    const infoResponse = await fetch(`http://${deviceIp}/json/info`);

    if (!configResponse.ok || !stateResponse.ok) {
      status.issues.push('Failed to fetch WLED configuration');
      return status;
    }

    const config = await configResponse.json();
    const state = await stateResponse.json();
    const info = await infoResponse.json();

    // Check LED strip color order from segment config
    let detectedColorOrder = 'RGB';
    if (config.hw && config.hw.led && config.hw.led.ins && config.hw.led.ins[0]) {
      const colorOrder = config.hw.led.ins[0].order;
      const colorOrderNames = ['GRB', 'RGB', 'BRG', 'RBG', 'GBR', 'BGR'];
      detectedColorOrder = colorOrderNames[colorOrder] || 'RGB';
      logger.log(`🎨 LED Color Order: ${detectedColorOrder}`);
    } else {
      logger.log(`🎨 LED Color Order: Using default RGB`);
    }

    // Check if UDP Realtime is enabled (CRITICAL for our use case)
    // This is different from UDP Sound Sync - we're sending LED colors directly
    if (config.if && config.if.live !== undefined) {
      // config.if.live.en = UDP Realtime enabled
      if (config.if.live.en !== undefined) {
        status.udpRealtimeEnabled = config.if.live.en === true;

        if (!status.udpRealtimeEnabled) {
          status.issues.push('UDP Realtime is disabled. Tap "Enable UDP" to fix.');
        }
      } else {
        status.issues.push('Cannot determine UDP Realtime status');
      }

      // UDP Realtime ALWAYS uses port 21324 (hardcoded in WLED)
      // The config.if.live.port is for E1.31/DMX, NOT UDP Realtime
      status.realtimePort = 21324;

      logger.log(`   UDP Realtime uses fixed port: 21324 (hardcoded in WLED)`);

      // Check timeout setting (optional but useful info)
      if (config.if.live.timeout !== undefined && status.udpRealtimeEnabled) {
        logger.log(`   UDP Realtime timeout: ${config.if.live.timeout} seconds`);
      }
    } else {
      status.issues.push('Cannot access UDP Realtime configuration');
    }

    // Also check UDP Sound Sync (informational - not needed for our approach)
    if (config.if && config.if.sync) {
      const infoResponse = await fetch(`http://${deviceIp}/json/info`);
      if (infoResponse.ok) {
        const info = await infoResponse.json();

        // Check if Audio Reactive usermod is present
        if (info.u && info.u.AudioReactive) {
          status.hasAudioReactive = true;

          // Check if UDP sound sync is enabled in AudioReactive usermod
          const arConfig = info.u.AudioReactive;
          if (arConfig.UDPSound !== undefined) {
            status.udpSyncEnabled = arConfig.UDPSound === true;
          }

          // Check audio source setting (informational)
          if (arConfig.audioSource !== undefined) {
            const sources = ['None', 'Microphone', 'Line-In', 'UDP Sound Sync', 'I2S'];
            status.audioSource = sources[arConfig.audioSource] || `Unknown (${arConfig.audioSource})`;
          }
        }
      }
    }

    // Check current effect (informational - not needed for UDP Realtime)
    if (state.seg && state.seg[0]) {
      const effectId = state.seg[0].fx;
      status.currentEffect = state.seg[0].name || `Effect ${effectId}`;

      // Note: When using UDP Realtime, the current effect doesn't matter
      // because we're controlling LEDs directly, bypassing WLED effects
      logger.log(`   Current Effect: ${status.currentEffect} (will be overridden by UDP Realtime)`);
    }

    // Overall ready status - UDP Realtime enabled AND correct port
    status.isReady = status.udpRealtimeEnabled && (status.realtimePort === expectedPort || status.realtimePort === null);

    logger.log(`📊 WLED Config Check for ${deviceIp}:`);
    logger.log(`   UDP Realtime Enabled: ${status.udpRealtimeEnabled ? '✅' : '❌'}`);
    logger.log(`   UDP Realtime Port: ${status.realtimePort || 'Unknown'} (expected: ${expectedPort})`);
    logger.log(`   Has AudioReactive usermod: ${status.hasAudioReactive ? '✅' : 'ℹ️ (not needed)'}`);
    logger.log(`   UDP Sound Sync: ${status.udpSyncEnabled ? '✅' : 'ℹ️ (not needed)'}`);
    logger.log(`   Audio Source: ${status.audioSource || 'N/A (not needed)'}`);
    logger.log(`   Ready for UDP Realtime: ${status.isReady ? '✅' : '❌'}`);

    if (status.issues.length > 0) {
      logger.warn('   Issues:', status.issues);
    }

  } catch (error) {
    logger.error('Failed to check WLED config:', error);
    status.issues.push(`Failed to connect to WLED device: ${error}`);
  }

  return status;
}

/**
 * Enable or disable UDP Realtime on WLED device
 * Note: This changes the config which requires a reboot to persist
 */
export async function setWLEDUdpRealtime(deviceIp: string, enable: boolean): Promise<{ success: boolean; needsReboot: boolean }> {
  try {
    logger.log(`🔧 ${enable ? 'Enabling' : 'Disabling'} UDP Realtime on ${deviceIp}...`);

    // WLED API: POST to /json/cfg to update config (persists across reboots)
    const response = await fetch(`http://${deviceIp}/json/cfg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        if: {
          live: {
            en: enable, // Enable/disable UDP Realtime
          }
        }
      }),
    });

    if (!response.ok) {
      logger.error(`Failed to update UDP Realtime: ${response.status}`);
      return { success: false, needsReboot: false };
    }

    logger.log(`✅ UDP Realtime ${enable ? 'enabled' : 'disabled'} - reboot required`);
    return { success: true, needsReboot: true };
  } catch (error) {
    logger.error('Error updating UDP Realtime:', error);
    return { success: false, needsReboot: false };
  }
}

/**
 * Reboot WLED device
 */
export async function rebootWLED(deviceIp: string): Promise<boolean> {
  try {
    logger.log(`🔄 Rebooting WLED device at ${deviceIp}...`);

    const response = await fetch(`http://${deviceIp}/json/state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rb: true, // Reboot command
      }),
    });

    if (!response.ok) {
      logger.error(`Failed to reboot WLED: ${response.status}`);
      return false;
    }

    logger.log(`✅ WLED reboot command sent`);
    return true;
  } catch (error) {
    logger.error('Error rebooting WLED:', error);
    return false;
  }
}
