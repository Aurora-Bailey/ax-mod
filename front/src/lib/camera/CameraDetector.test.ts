import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { get } from 'svelte/store';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import CameraDetector from './CameraDetector.svelte';
import { cameraDetector } from './detector-store';
import { rgbToLab } from './detection';

function makeStream(): MediaStream {
  return {
    getVideoTracks: () => [],
    getTracks: () => []
  } as unknown as MediaStream;
}

describe('CameraDetector', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: vi.fn()
    });
  });

  afterEach(() => {
    cameraDetector.resetForTests();
  });

  it('renders camera controls above the video with icon buttons and FPS', () => {
    render(CameraDetector);

    const toolbar = screen.getByLabelText('Camera controls');
    const video = document.querySelector('video');

    expect(toolbar).toContainElement(screen.getByLabelText('Webcam'));
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Refresh cameras' }));
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Start camera' }));
    expect(toolbar).toHaveTextContent('FPS: 0');
    expect(toolbar.compareDocumentPosition(video as HTMLVideoElement)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it('shows the merged stop button when a stream is active', async () => {
    const stream = makeStream();
    cameraDetector.setStream(stream);

    render(CameraDetector);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Stop camera' })).toBeInTheDocument();
      expect(document.querySelector('video')?.srcObject).toBe(stream);
    });
  });

  it('updates and clamps point square settings from the controls', async () => {
    cameraDetector.setVideoSize(100, 80);

    render(CameraDetector);
    await fireEvent.input(screen.getByLabelText('point1 X value'), {
      target: { value: '500', valueAsNumber: 500 }
    });

    expect(get(cameraDetector).points[0].square.x).toBe(99);
  });

  it('trains the current Lab-backed point value from the train button', async () => {
    const user = userEvent.setup();
    const currentRgb = { r: 80, g: 90, b: 100 };
    cameraDetector.setPointCurrentRgbs({ point1: currentRgb });

    render(CameraDetector);
    await user.click(screen.getByRole('button', { name: 'Train reference' }));

    expect(get(cameraDetector).points[0].referenceRgb).toEqual(currentRgb);
    expect(get(cameraDetector).points[0].referenceLab).toEqual(rgbToLab(currentRgb));
  });

  it('adds detection points and sound functions from the new sections', async () => {
    const user = userEvent.setup();

    render(CameraDetector);
    await user.click(screen.getByRole('button', { name: 'Add point' }));
    await user.click(screen.getByRole('button', { name: 'Add sound' }));

    expect(screen.getByRole('button', { name: /point2.*Settings/ })).toBeInTheDocument();
    expect(get(cameraDetector).functions[0].name).toBe('sound1');
    expect(screen.getByLabelText('Detection script')).toBeInTheDocument();
  });

  it('opens point settings as an accordion for added points', async () => {
    const user = userEvent.setup();

    render(CameraDetector);
    await user.click(screen.getByRole('button', { name: 'Add point' }));

    expect(screen.getByLabelText('point2 X value')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /point1.*Settings/ }));

    expect(screen.getByLabelText('point1 X value')).toBeInTheDocument();
    expect(screen.queryByLabelText('point2 X value')).not.toBeInTheDocument();
  });

  it('renders the default point1 activation script and dev guide', () => {
    render(CameraDetector);

    expect(screen.getByLabelText('Detection script')).toHaveValue(
      'ONACTION point1 | point1 IS TRUE ? FUNCTION sound1 : FUNCTION null'
    );
    expect(screen.getByRole('heading', { name: 'Coding dev guide' })).toBeInTheDocument();
  });
});
