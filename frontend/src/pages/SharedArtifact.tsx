import { useEffect } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { DownloadSimple, LockKey, ShareNetwork } from '@phosphor-icons/react';
import { sileo } from 'sileo';
import { Button } from '../components/ui/Button';
import VaultMediaSurface from '../components/vault/VaultMediaSurface';
import { parseRouteTarget } from '../lib/deepLinks';
import { resolveShareLink } from '../features/share/share.service';
import { downloadArtifact } from '../lib/files';

function getErrorStatus(error: unknown) {
  return typeof error === 'object' && error !== null && 'response' in error
    ? (error as any).response?.status
    : null;
}

function getDownloadFilename(item: any) {
  const source = String(item.restoredUrl || item.url || '');
  const ext = source.split('.').pop()?.split(/[#?]/)[0] || 'file';
  const title = String(item.title || 'legacy-artifact')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'legacy-artifact';
  return `${title}.${ext}`;
}

export default function SharedArtifact() {
  const { token } = useParams({ strict: false });
  const navigate = useNavigate();
  const { data, error, isLoading } = useQuery({
    queryKey: ['share', token],
    queryFn: () => resolveShareLink(String(token)),
    retry: false,
    enabled: !!token,
  });

  useEffect(() => {
    if (data?.mode === 'redirect' && data.redirectPath) {
      const target = parseRouteTarget(data.redirectPath);
      void navigate(target as any);
    }
  }, [data, navigate]);

  if (isLoading || data?.mode === 'redirect') {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[var(--clr-parchment)] px-6 text-center">
        <p className="font-ui text-sm uppercase tracking-[0.22em] text-[var(--clr-dust)]">Opening share...</p>
      </div>
    );
  }

  const status = getErrorStatus(error);
  if (status === 401) {
    const redirect = `/share/${token}`;
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[var(--clr-parchment)] px-6">
        <div className="max-w-md text-center">
          <LockKey size={36} className="mx-auto text-[var(--clr-gold-dark)]" />
          <h1 className="mt-4 font-display text-[2rem] uppercase tracking-wide text-[var(--clr-ink)]">Sign In Required</h1>
          <p className="mt-3 font-ui text-sm leading-relaxed text-[var(--clr-dust)]">This share is available only to authenticated LegacyKeeper users.</p>
          <Link to="/auth" search={{ redirect }}>
            <Button className="mt-6">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (error || !data?.item) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[var(--clr-parchment)] px-6 text-center">
        <div>
          <h1 className="font-display text-[2rem] uppercase tracking-wide text-[var(--clr-ink)]">Share Unavailable</h1>
          <p className="mt-3 font-ui text-sm text-[var(--clr-dust)]">This link is invalid, revoked, or unavailable to your vault.</p>
        </div>
      </div>
    );
  }

  const item = data.item;
  const isMemory = data.itemType === 'MEMORY';
  const title = item.title || item.name || 'Shared Artifact';
  const caption = item.human_caption || item.ai_caption || item.biography || '';
  const handleDownload = async () => {
    if (!isMemory || !item.url) return;
    try {
      await downloadArtifact(item.restoredUrl || item.url, getDownloadFilename(item));
      sileo.success({ title: 'Artifact Downloaded' });
    } catch {
      sileo.error({ title: 'Download Failed', description: 'The artifact could not be downloaded.' });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--clr-parchment)] px-[clamp(20px,5vw,72px)] py-10">
      <main className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--clr-aged)] pb-5">
          <div>
            <p className="font-ui text-[10px] font-black uppercase tracking-[0.24em] text-[var(--clr-gold-dark)]">Shared LegacyKeeper {isMemory ? 'Artifact' : 'Life Page'}</p>
            <h1 className="mt-2 font-display text-[clamp(2rem,5vw,4rem)] uppercase leading-none tracking-wide text-[var(--clr-ink)]">{title}</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--clr-aged)] bg-[var(--clr-linen)] px-4 py-2 font-ui text-[10px] font-black uppercase tracking-[0.18em] text-[var(--clr-dust)]">
            <ShareNetwork size={14} /> {data.vaultName}
          </div>
        </div>

        {isMemory ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_360px]">
            <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--clr-aged)] bg-[var(--clr-soot)]">
              <VaultMediaSurface
                src={item.restoredUrl || item.url}
                title={title}
                exif={item.exif_json}
                imageClassName="h-full w-full object-contain"
              />
            </div>
            <aside className="space-y-5">
              <Button variant="primary" onClick={handleDownload} className="w-full">
                <DownloadSimple size={18} weight="bold" /> Download Artifact
              </Button>
              <div>
                <p className="font-ui text-[10px] font-black uppercase tracking-[0.2em] text-[var(--clr-dust)]">Caption</p>
                <p className="mt-2 font-ui text-sm leading-relaxed text-[var(--clr-ink)]">{caption || 'No caption has been added.'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[var(--radius-md)] border border-[var(--clr-aged)] bg-[var(--clr-linen)] p-4">
                  <p className="font-ui text-[9px] font-black uppercase tracking-[0.18em] text-[var(--clr-dust)]">Date</p>
                  <p className="mt-1 font-ui text-sm text-[var(--clr-ink)]">{item.date || item.year || 'Unrecorded'}</p>
                </div>
                <div className="rounded-[var(--radius-md)] border border-[var(--clr-aged)] bg-[var(--clr-linen)] p-4">
                  <p className="font-ui text-[9px] font-black uppercase tracking-[0.18em] text-[var(--clr-dust)]">Location</p>
                  <p className="mt-1 font-ui text-sm text-[var(--clr-ink)]">{item.location || 'Unknown'}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(item.tags || []).map((tag: string) => (
                  <span key={tag} className="rounded-full border border-[var(--clr-aged)] bg-[var(--clr-linen)] px-3 py-1 font-ui text-[10px] font-black uppercase tracking-[0.14em] text-[var(--clr-dust)]">{tag}</span>
                ))}
              </div>
            </aside>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
            <img src={item.photo} alt={title} className="aspect-square w-full rounded-full border-4 border-[var(--clr-gold)] object-cover shadow-[var(--shadow-gold)]" />
            <div>
              <p className="font-ui text-[12px] font-black uppercase tracking-[0.2em] text-[var(--clr-dust)]">{item.role || 'Relative'}</p>
              <p className="mt-5 font-ui text-base leading-8 text-[var(--clr-ink)]">{caption || 'No biography has been written yet.'}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                {[item.birthYear && `Born ${item.birthYear}`, item.deathYear && `Passed ${item.deathYear}`, `${item.memoryCount || 0} tagged memories`].filter(Boolean).map((value: string) => (
                  <span key={value} className="rounded-full border border-[var(--clr-aged)] bg-[var(--clr-linen)] px-4 py-2 font-ui text-[10px] font-black uppercase tracking-[0.14em] text-[var(--clr-dust)]">{value}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
