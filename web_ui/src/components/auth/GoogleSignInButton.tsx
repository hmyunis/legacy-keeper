import React, { useEffect, useRef } from 'react';
import { loadGoogleIdentityScript } from '../../services/googleIdentity';

interface GoogleSignInButtonProps {
  clientId: string;
  onCredential: (idToken: string) => void;
  onError: (message: string) => void;
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ clientId, onCredential, onError }) => {
  const buttonContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isActive = true;

    const mountButton = async () => {
      if (!clientId || !buttonContainerRef.current) {
        return;
      }

      try {
        await loadGoogleIdentityScript();
        if (!isActive || !window.google?.accounts?.id || !buttonContainerRef.current) {
          return;
        }

        buttonContainerRef.current.innerHTML = '';

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              onCredential(response.credential);
              return;
            }
            onError('Google sign-in did not return a credential.');
          },
          ux_mode: 'popup',
        });

        window.google.accounts.id.renderButton(buttonContainerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: 360,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Google sign-in is unavailable.';
        onError(message);
      }
    };

    mountButton();

    return () => {
      isActive = false;
    };
  }, [clientId, onCredential, onError]);

  if (!clientId) {
    return null;
  }

  return <div ref={buttonContainerRef} className="flex justify-center" />;
};

export default GoogleSignInButton;
