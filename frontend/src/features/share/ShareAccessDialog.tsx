import { useState, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, GlobeHemisphereWest, LockKey, LinkSimple, ShareNetwork, TreeStructure, UsersThree, X } from '@phosphor-icons/react';
import { sileo } from 'sileo';
import { Button } from '../../components/ui/Button';
import { Tooltip } from '../../components/ui/Tooltip';
import { buildShareUrl } from '../../lib/deepLinks';
import { createShareLink, type ShareAudience, type ShareItemType, type ShareVaultScope } from './share.service';

type ShareIcon = ComponentType<any>;

interface ShareAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: ShareItemType;
  itemId: string;
  vaultId?: string | null;
  title: string;
  text?: string;
}

const audienceOptions: { value: ShareAudience; label: string; description: string; icon: ShareIcon }[] = [
  { value: 'PUBLIC', label: 'Everyone with a link', description: 'Guests can view the shared page without signing in.', icon: GlobeHemisphereWest },
  { value: 'AUTHENTICATED', label: 'Authenticated only', description: 'A LegacyKeeper account is required before opening it.', icon: LockKey },
];

const scopeOptions: { value: ShareVaultScope; label: string; description: string; icon: ShareIcon }[] = [
  { value: 'SAME_VAULT', label: 'Same vault', description: 'Only accounts in this vault can open it.', icon: UsersThree },
  { value: 'LINEAGE_PACT', label: 'Lineage pact', description: 'Accounts in this vault or pacted vaults can open it.', icon: TreeStructure },
  { value: 'ANY_VAULT', label: 'Any vault', description: 'Any signed-in account attached to a vault can open it.', icon: GlobeHemisphereWest },
];

function OptionButton({
  selected,
  label,
  description,
  Icon,
  compact = false,
  onClick,
}: {
  selected: boolean;
  label: string;
  description: string;
  Icon: ShareIcon;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full items-start gap-3 rounded-[var(--radius-md)] border text-left transition-all ${
        selected
          ? 'border-[var(--clr-gold)] bg-[rgba(184,143,91,0.15)] text-[var(--clr-ink)] shadow-[0_12px_30px_rgba(83,64,42,0.08)]'
          : 'border-[var(--clr-aged)] bg-[rgba(247,244,239,0.74)] text-[var(--clr-ink)] hover:-translate-y-0.5 hover:border-[var(--clr-gold)] hover:bg-[var(--clr-linen)]'
      } ${compact ? 'p-3' : 'p-4 sm:p-5'}`}
    >
      <span className={`mt-0.5 flex shrink-0 items-center justify-center rounded-full border bg-[var(--clr-paper)] transition-colors ${
        selected ? 'border-[var(--clr-gold)] text-[var(--clr-gold-dark)]' : 'border-[var(--clr-aged)] text-[var(--clr-dust)] group-hover:text-[var(--clr-gold-dark)]'
      } ${compact ? 'h-8 w-8' : 'h-10 w-10'}`}>
        <Icon size={compact ? 16 : 19} weight="bold" />
      </span>
      <span className="min-w-0">
        <span className={`block font-ui font-black uppercase text-[var(--clr-ink)] ${compact ? 'text-[10px] tracking-[0.12em]' : 'text-[12px] tracking-[0.14em]'}`}>{label}</span>
        <span className={`mt-1 block font-ui leading-relaxed text-[var(--clr-dust)] ${compact ? 'text-[11px]' : 'text-[12px]'}`}>{description}</span>
      </span>
      {selected && (
        <span className="absolute right-3 top-3 text-[var(--clr-gold-dark)]">
          <CheckCircle size={18} weight="fill" />
        </span>
      )}
    </button>
  );
}

export function ShareAccessDialog({ open, onOpenChange, itemType, itemId, vaultId, title, text }: ShareAccessDialogProps) {
  const [audience, setAudience] = useState<ShareAudience>('PUBLIC');
  const [vaultScope, setVaultScope] = useState<ShareVaultScope>('SAME_VAULT');
  const [isSharing, setIsSharing] = useState(false);
  const requiresScope = audience === 'AUTHENTICATED';

  const handleCreateShare = async () => {
    if (!vaultId) {
      sileo.error({ title: 'Share Failed', description: 'The active vault could not be resolved.' });
      return;
    }

    setIsSharing(true);
    try {
      const share = await createShareLink({
        itemType,
        itemId,
        vaultId,
        audience,
        vaultScope: requiresScope ? vaultScope : 'SAME_VAULT',
      });
      const shareUrl = buildShareUrl(share.token);
      const shareData = {
        title,
        text: text || 'Open this LegacyKeeper share.',
        url: shareUrl,
      };

      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
        sileo.success({ title: 'Share Sheet Opened' });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        sileo.success({ title: 'Link Copied', description: 'Share link copied to clipboard.' });
      }
      onOpenChange(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      sileo.error({ title: 'Share Failed', description: 'The share link could not be created.' });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(20,18,17,0.64)] p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="w-full max-w-2xl overflow-hidden rounded-[var(--radius-md)] border border-[var(--clr-aged)] bg-[var(--clr-paper)] shadow-[var(--shadow-xl)]"
          >
            <div className="relative flex items-start justify-between gap-4 overflow-hidden border-b border-[var(--clr-aged)] bg-[linear-gradient(135deg,rgba(247,244,239,1),rgba(236,226,205,0.92))] p-5 sm:p-6">
              <div className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,var(--clr-gold),transparent)] opacity-60" />
              <div>
                <p className="font-ui text-[10px] font-black uppercase tracking-[0.22em] text-[var(--clr-gold-dark)]">Share Access</p>
                <h2 className="mt-1 font-display text-[1.8rem] uppercase leading-none tracking-wide text-[var(--clr-ink)]">Create Link</h2>
                <p className="mt-2 max-w-xl font-ui text-[12px] leading-relaxed text-[var(--clr-dust)]">Choose how this link opens before sending it.</p>
              </div>
              <Tooltip content="Close">
                <button
                  type="button"
                  aria-label="Close share access"
                  onClick={() => onOpenChange(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--clr-aged)] text-[var(--clr-dust)] hover:border-[var(--clr-gold)] hover:text-[var(--clr-gold)]"
                >
                  <X size={16} weight="bold" />
                </button>
              </Tooltip>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-5 sm:p-6">
              <p className="mb-3 font-ui text-[10px] font-black uppercase tracking-[0.2em] text-[var(--clr-dust)]">Who can open this link?</p>
              <div className="grid gap-3 md:grid-cols-2">
                {audienceOptions.map((option) => (
                  <OptionButton
                    key={option.value}
                    selected={audience === option.value}
                    label={option.label}
                    description={option.description}
                    Icon={option.icon}
                    onClick={() => setAudience(option.value)}
                  />
                ))}
              </div>

              <AnimatePresence initial={false}>
                {requiresScope && (
                  <motion.div
                    key="scope-options"
                    initial={{ opacity: 0, height: 0, y: -6 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="mt-5 overflow-hidden"
                  >
                    <p className="mb-3 font-ui text-[10px] font-black uppercase tracking-[0.2em] text-[var(--clr-dust)]">Which authenticated vaults?</p>
                    <div className="grid gap-3 lg:grid-cols-3">
                      {scopeOptions.map((option) => (
                        <OptionButton
                          key={option.value}
                          selected={vaultScope === option.value}
                          label={option.label}
                          description={option.description}
                          Icon={option.icon}
                          compact
                          onClick={() => setVaultScope(option.value)}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-5 rounded-[var(--radius-md)] border border-[rgba(184,143,91,0.28)] bg-[rgba(184,143,91,0.08)] p-4">
                <p className="font-ui text-[10px] font-black uppercase tracking-[0.2em] text-[var(--clr-gold-dark)]">Link Behavior</p>
                <p className="mt-1 font-ui text-[12px] leading-relaxed text-[var(--clr-ink)]">
                  {requiresScope
                    ? 'Only signed-in users matching the selected vault scope can view this shared page.'
                    : 'Anyone with the link can view the shared page. Signed-in members of the owning vault will open the item directly.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[var(--clr-aged)] p-5 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                <X size={16} /> Cancel
              </Button>
              <Button variant="primary" onClick={handleCreateShare} disabled={isSharing || !vaultId} className="w-full sm:w-auto">
                {isSharing ? <LinkSimple size={18} /> : <ShareNetwork size={18} />}
                {isSharing ? 'Creating...' : 'Share Link'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
