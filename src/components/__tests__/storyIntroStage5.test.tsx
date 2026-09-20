import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../App.js';
import { StoryIntro } from '../StoryIntro.js';

describe('Stage 5 Scroll Story Intro', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.innerWidth = 1440;
    window.innerHeight = 900;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('renders StoryIntro above the existing tool with id="app"', () => {
    const { container } = render(<App />);

    const appTool = container.querySelector('#app');
    expect(appTool).not.toBeNull();
    expect(appTool).toBeInTheDocument();

    const storySection = screen.getByLabelText(/RxDiff Visual Narrative Intro/i);
    expect(storySection).toBeInTheDocument();
  });

  it('renders Skip story button that navigates to #app', () => {
    const scrollIntoViewMock = vi.fn();
    const appEl = document.createElement('div');
    appEl.id = 'app';
    appEl.scrollIntoView = scrollIntoViewMock;
    document.body.appendChild(appEl);

    render(<StoryIntro />);

    const skipButtons = screen.getAllByRole('button', { name: /skip story/i });
    expect(skipButtons.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(skipButtons[0]);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });

    document.body.removeChild(appEl);
  });

  it('contains the 3 required narrative captions', () => {
    render(<StoryIntro />);

    // Scene 1 caption
    expect(
      screen.getAllByText(/You leave the hospital with a new list of medicines\./i).length
    ).toBeGreaterThanOrEqual(1);

    // Mobile stacked scene captions contain scene 2 and scene 3
    expect(
      screen.getAllByText(/Two lists\. The differences between them are easy to miss\./i).length
    ).toBeGreaterThanOrEqual(1);

    expect(
      screen.getAllByText(/RxDiff makes every difference visible - and shows you exactly where it came from\./i).length
    ).toBeGreaterThanOrEqual(1);
  });

  it('respects prefers-reduced-motion without sticky scrub or autoplay', () => {
    // Mock matchMedia for prefers-reduced-motion: reduce
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<StoryIntro />);

    const reducedMotionSection = screen.getByLabelText(/RxDiff Visual Narrative Intro \(Reduced Motion\)/i);
    expect(reducedMotionSection).toBeInTheDocument();

    // Verify static scenes exist
    expect(screen.getByText(/Scene 01/i)).toBeInTheDocument();
    expect(screen.getByText(/Scene 02/i)).toBeInTheDocument();
    expect(screen.getByText(/Scene 03/i)).toBeInTheDocument();
  });

  it('renders correctly at 390x844 mobile viewport with stacked scenes', () => {
    window.innerWidth = 390;
    window.innerHeight = 844;

    const { container } = render(<StoryIntro />);

    // Mobile skip button is present
    expect(screen.getByText(/Skip to tool/i)).toBeInTheDocument();

    // All 3 mobile scenes are rendered
    expect(screen.getByText(/Scene 01/i)).toBeInTheDocument();
    expect(screen.getByText(/Scene 02/i)).toBeInTheDocument();
    expect(screen.getByText(/Scene 03/i)).toBeInTheDocument();

    // Videos are muted, playsInline
    const videos = container.querySelectorAll('video');
    expect(videos.length).toBeGreaterThanOrEqual(3);
    videos.forEach((video) => {
      expect((video as HTMLVideoElement).muted).toBe(true);
      expect(video).toHaveAttribute('playsinline');
    });
  });

  it('re-states safety warning on scene 3', () => {
    render(<StoryIntro />);

    // Warning text is rendered in the story section
    expect(
      screen.getAllByText(/Confirm every difference with a doctor or pharmacist\./i).length
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders journey hero headline, support copy, and emergent difference elements', () => {
    render(<StoryIntro />);

    // Hero headline and support
    expect(screen.getByText(/The important changes can hide between two lists\./i)).toBeInTheDocument();
    expect(screen.getByText(/RxDiff reveals what changed and links every flag back to its source\./i)).toBeInTheDocument();

    // Case A Metformin difference data
    expect(screen.getAllByText(/Metformin/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/CHANGED/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Frequency: 1× daily → 2× daily/i).length).toBeGreaterThanOrEqual(1);
  });

  it('provides keyboard skip link navigating to #workspace', () => {
    const { container } = render(<App />);

    const skipLink = container.querySelector('a[href="#workspace"]');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveTextContent(/Skip to medication comparison/i);

    const workspaceEl = container.querySelector('#workspace');
    expect(workspaceEl).toBeInTheDocument();
  });

  it('renders 3 high-performance canvas elements for frame-sequence rendering', () => {
    const { container } = render(<StoryIntro />);
    const canvases = container.querySelectorAll('canvas');
    expect(canvases.length).toBe(3);
  });

  it('displays the quiet frame loading indicator during initial frame preparation', () => {
    render(<StoryIntro />);
    const indicator = screen.getByLabelText(/Story loading status/i);
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveTextContent(/Preparing visual story/i);
  });
});

