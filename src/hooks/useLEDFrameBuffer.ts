/**
 * FIFO Frame Buffer Hook for LED Visualization
 *
 * Prevents "Maximum update depth exceeded" errors by buffering incoming LED frames
 * and providing them to the renderer at a controlled rate.
 *
 * Strategy:
 * - Provides a callback to queue frames (doesn't rely on props/state)
 * - Queue incoming LED frames (FIFO)
 * - Drop oldest frames when buffer is full (prevents memory overflow)
 * - Renderer fetches frames via requestAnimationFrame at ~60fps
 * - Only triggers React re-render when new frame is available for display
 *
 * Example:
 * ```tsx
 * const { currentFrame, queueFrame } = useLEDFrameBuffer({ enabled: liveViewEnabled });
 *
 * // In WebSocket handler:
 * wledWebSocketService.on('leds', (leds) => {
 *   queueFrame(leds);
 * });
 *
 * // Pass currentFrame to LEDVisualization
 * <LEDVisualization ledData={currentFrame} />
 * ```
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { LEDColor } from "../services/wled";

const MAX_BUFFER_SIZE = 30; // Maximum frames to buffer
const TARGET_FPS = 60; // Target rendering FPS
const FRAME_INTERVAL = 1000 / TARGET_FPS; // ~16.67ms

interface UseLEDFrameBufferOptions {
  enabled: boolean; // Whether buffering is active
  maxBufferSize?: number;
}

export function useLEDFrameBuffer(options: UseLEDFrameBufferOptions) {
  const { enabled, maxBufferSize = MAX_BUFFER_SIZE } = options;

  // Current frame to display (triggers React re-render when updated)
  const [currentFrame, setCurrentFrame] = useState<LEDColor[]>([]);

  // Frame buffer queue (ref to avoid re-renders)
  const bufferQueue = useRef<LEDColor[][]>([]);

  // Animation frame ID for cleanup
  const rafId = useRef<number | null>(null);

  // Last render timestamp for FPS control
  const lastRenderTime = useRef<number>(0);

  // Callback to queue a new frame (doesn't trigger re-renders)
  const queueFrame = useCallback(
    (ledData: LEDColor[]) => {
      if (!enabled || ledData.length === 0) {
        return;
      }

      // Add new frame to buffer
      bufferQueue.current.push([...ledData]);

      // Drop oldest frames if buffer is full (FIFO overflow handling)
      while (bufferQueue.current.length > maxBufferSize) {
        bufferQueue.current.shift();
      }
    },
    [enabled, maxBufferSize]
  );

  // Renderer: Fetch frames from buffer at controlled rate
  useEffect(() => {
    if (!enabled) {
      // Clear buffer and frame when disabled
      bufferQueue.current = [];
      setCurrentFrame([]);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      return;
    }

    const renderLoop = (timestamp: number) => {
      // FPS throttling: only render if enough time has passed
      const timeSinceLastRender = timestamp - lastRenderTime.current;

      if (timeSinceLastRender >= FRAME_INTERVAL) {
        // Fetch next frame from buffer (FIFO)
        const nextFrame = bufferQueue.current.shift();

        if (nextFrame) {
          // Update current frame (triggers React re-render)
          setCurrentFrame(nextFrame);
          lastRenderTime.current = timestamp;
        }
      }

      // Continue render loop
      rafId.current = requestAnimationFrame(renderLoop);
    };

    // Start render loop
    rafId.current = requestAnimationFrame(renderLoop);

    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [enabled]);

  // Return current frame and queue callback
  return { currentFrame, queueFrame };
}
