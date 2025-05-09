declare module 'wavesurfer.js' {
  interface WaveSurferOptions {
    container: HTMLElement | string;
    height?: number;
    waveColor?: string;
    progressColor?: string;
    cursorColor?: string;
    cursorWidth?: number;
    barWidth?: number;
    barGap?: number;
    barRadius?: number;
    responsive?: boolean;
    normalize?: boolean;
    partialRender?: boolean;
    pixelRatio?: number;
    fillParent?: boolean;
    scrollParent?: boolean;
    skipLength?: number;
    mediaControls?: boolean;
    backend?: string;
    mediaType?: string;
    autoCenter?: boolean;
    hideScrollbar?: boolean;
    minPxPerSec?: number;
    interact?: boolean;
    [key: string]: any;
  }

  class WaveSurfer {
    static create(options: WaveSurferOptions): WaveSurfer;
    
    // Methods
    load(url: string): void;
    play(start?: number, end?: number): void;
    pause(): void;
    stop(): void;
    isPlaying(): boolean;
    skip(seconds: number): void;
    seekTo(progress: number): void;
    setVolume(newVolume: number): void;
    getVolume(): number;
    setPlaybackRate(rate: number): void;
    getPlaybackRate(): number;
    getCurrentTime(): number;
    getDuration(): number;
    exportPCM(length: number, accuracy: number, noWindow: boolean, start: number): Float32Array[];
    exportImage(format: string, quality: number, type: string): string;
    destroy(): void;
    empty(): void;
    getMediaElement(): HTMLMediaElement | null;
    
    // Events
    on(event: string, callback: (...args: any[]) => void): void;
    un(event: string, callback: (...args: any[]) => void): void;
    unAll(): void;
    once(event: string, callback: (...args: any[]) => void): void;
  }

  export default WaveSurfer;
}
