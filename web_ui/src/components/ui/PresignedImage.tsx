import React, { useEffect, useRef, useState } from 'react';

interface PresignedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  onRecover?: () => Promise<unknown>;
  maxRecoveries?: number;
}

const PresignedImage: React.FC<PresignedImageProps> = ({
  src,
  onRecover,
  maxRecoveries = 1,
  onError,
  onLoad,
  ...imgProps
}) => {
  const normalizedSrc = src || '';
  const [renderSrc, setRenderSrc] = useState(normalizedSrc);
  const [isRecovering, setIsRecovering] = useState(false);
  const recoveriesRef = useRef(0);
  const latestSrcRef = useRef(normalizedSrc);
  const lastLoadedSrcRef = useRef('');

  useEffect(() => {
    latestSrcRef.current = normalizedSrc;
    setRenderSrc(normalizedSrc);
    recoveriesRef.current = 0;
  }, [normalizedSrc]);

  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    lastLoadedSrcRef.current = event.currentTarget.currentSrc || renderSrc;
    onLoad?.(event);
  };

  const handleError = async (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    onError?.(event);

    if (isRecovering) return;
    if (!onRecover) return;
    if (recoveriesRef.current >= maxRecoveries) return;

    recoveriesRef.current += 1;
    setIsRecovering(true);
    if (lastLoadedSrcRef.current && lastLoadedSrcRef.current !== renderSrc) {
      setRenderSrc(lastLoadedSrcRef.current);
    }

    try {
      await onRecover();
    } finally {
      const nextSrc = latestSrcRef.current;
      if (nextSrc) {
        setRenderSrc('');
        window.setTimeout(() => setRenderSrc(nextSrc), 0);
      }
      setIsRecovering(false);
    }
  };

  return <img {...imgProps} src={renderSrc} onLoad={handleLoad} onError={handleError} />;
};

export default PresignedImage;
