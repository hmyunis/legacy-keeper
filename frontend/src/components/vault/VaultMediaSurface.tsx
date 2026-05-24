import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPlayer } from '@videojs/react';
import { Video, VideoSkin, videoFeatures } from '@videojs/react/video';
import { Audio, AudioSkin, audioFeatures } from '@videojs/react/audio';
import { Viewer, Worker, SpecialZoomLevel } from '@react-pdf-viewer/core';
import { detectVaultMediaType } from '../../features/vault/lib/mediaType';
import axiosClient from '../../services/axiosClient';

import '@videojs/react/video/skin.css';
import '@videojs/react/audio/skin.css';
import '@react-pdf-viewer/core/lib/styles/index.css';

const VideoPlayer = createPlayer({ features: videoFeatures });
const AudioPlayer = createPlayer({ features: audioFeatures });

interface VaultMediaSurfaceProps {
  src: string;
  title?: string;
  exif?: Record<string, unknown>;
  imageClassName?: string;
  imageStyle?: CSSProperties;
}

export default function VaultMediaSurface({ src, title, exif, imageClassName, imageStyle }: VaultMediaSurfaceProps) {
  const mediaType = useMemo(() => detectVaultMediaType(src, exif), [src, exif]);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (mediaType !== 'pdf' || !src) {
      setPdfBlobUrl(null);
      setPdfLoadError(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    const loadPdf = async () => {
      try {
        setPdfLoadError(null);
        const res = await axiosClient.get(src, { responseType: 'blob' });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setPdfBlobUrl(objectUrl);
      } catch {
        if (cancelled) return;
        setPdfBlobUrl(null);
        setPdfLoadError('The document was blocked by a browser extension or privacy filter.');
      }
    };

    void loadPdf();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mediaType, src]);

  if (mediaType === 'video') {
    return (
      <div className="w-full max-w-full vault-vjs-surface" onContextMenu={(e) => e.preventDefault()}>
        <VideoPlayer.Provider>
          <VideoSkin className="vault-vjs-skin">
            <Video
              src={src}
              playsInline
              controlsList="nodownload noplaybackrate noremoteplayback"
              disablePictureInPicture
            />
          </VideoSkin>
        </VideoPlayer.Provider>
      </div>
    );
  }

  if (mediaType === 'audio') {
    return (
      <div className="w-full max-w-[780px] vault-vjs-surface" onContextMenu={(e) => e.preventDefault()}>
        <AudioPlayer.Provider>
          <AudioSkin className="vault-vjs-skin">
            <Audio
              src={src}
              controlsList="nodownload noplaybackrate noremoteplayback"
            />
          </AudioSkin>
        </AudioPlayer.Provider>
      </div>
    );
  }

  if (mediaType === 'pdf') {
    if (pdfLoadError) {
      return (
        <div className="w-full h-full rounded-sm border-4 border-white/10 bg-[var(--clr-linen)] shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden flex items-center justify-center p-6 text-center">
          <div>
            <p className="font-display text-[1.2rem] uppercase tracking-widest text-[var(--clr-gold-dark)]">PDF Preview Blocked</p>
            <p className="font-ui text-[11px] mt-2 text-[var(--clr-dust)]">{pdfLoadError}</p>
          </div>
        </div>
      );
    }

    if (!pdfBlobUrl) {
      return (
        <div className="w-full h-full rounded-sm border-4 border-white/10 bg-[var(--clr-linen)] shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden flex items-center justify-center p-6 text-center">
          <p className="font-ui text-[11px] uppercase tracking-widest text-[var(--clr-dust)]">Loading document preview...</p>
        </div>
      );
    }

    return (
      <div className="w-full h-full rounded-sm border-4 border-white/10 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
          <Viewer
            fileUrl={pdfBlobUrl}
            defaultScale={SpecialZoomLevel.PageFit}
            renderError={(error) => (
              <div className="h-full w-full flex items-center justify-center bg-[var(--clr-linen)] p-6 text-center">
                <div>
                  <p className="font-display text-[1.2rem] uppercase tracking-widest text-[var(--clr-gold-dark)]">PDF Preview Unavailable</p>
                  <p className="font-ui text-[11px] mt-2 text-[var(--clr-dust)]">{error.message}</p>
                </div>
              </div>
            )}
          />
        </Worker>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title}
      className={imageClassName ?? 'max-w-full max-h-full object-contain drop-shadow-2xl border-4 border-white/10 rounded-sm'}
      style={imageStyle}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
