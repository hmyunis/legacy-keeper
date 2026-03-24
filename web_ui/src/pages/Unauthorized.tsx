import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { UnauthorizedActions } from '@/features/unauthorized/components/UnauthorizedActions';
import { UnauthorizedCard } from '@/features/unauthorized/components/UnauthorizedCard';
import {
  getUnauthorizedCandidateVaults,
  getUnauthorizedRequiredRoles,
  parseUnauthorizedRetryTarget,
  resolveAttemptedUnauthorizedPath,
  resolveUnauthorizedSelectedVaultId,
} from '@/features/unauthorized/selectors';
import type { UnauthorizedSearchState } from '@/features/unauthorized/types';
import { useVaults } from '@/hooks/useVaults';
import { useTranslation } from '@/i18n/LanguageContext';
import { useAuthStore } from '@/stores/authStore';

const Unauthorized = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const search = useSearch({ strict: false }) as UnauthorizedSearchState;
  const { data: vaults } = useVaults();
  const { activeVaultId, setActiveVault, updateUser } = useAuthStore();
  const attemptedPath = resolveAttemptedUnauthorizedPath(search.from);

  const requiredRoles = useMemo(
    () => getUnauthorizedRequiredRoles(attemptedPath),
    [attemptedPath],
  );
  const candidateVaults = useMemo(
    () => getUnauthorizedCandidateVaults(vaults, requiredRoles),
    [requiredRoles, vaults],
  );

  const [selectedVaultId, setSelectedVaultId] = useState('');

  useEffect(() => {
    const resolvedSelection = resolveUnauthorizedSelectedVaultId({
      candidateVaults,
      selectedVaultId,
      activeVaultId,
    });
    if (resolvedSelection !== selectedVaultId) {
      setSelectedVaultId(resolvedSelection);
    }
  }, [activeVaultId, candidateVaults, selectedVaultId]);

  const switchVaultAndRetry = () => {
    const targetVault = candidateVaults.find((vault) => vault.id === selectedVaultId);
    if (!targetVault) return;

    setActiveVault(targetVault.id);
    if (targetVault.myRole) {
      updateUser({ role: targetVault.myRole });
    }

    const retryTarget = parseUnauthorizedRetryTarget(attemptedPath);
    if (!retryTarget) {
      navigate({ to: '/' });
      return;
    }

    navigate({ to: retryTarget.to as any, search: retryTarget.search as any });
  };

  return (
    <div className="max-w-3xl mx-auto py-12">
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-10 shadow-sm space-y-6">
        <UnauthorizedCard
          title={t.common.unauthorized.title}
          description={t.common.unauthorized.description}
          attemptedRouteLabel={t.common.unauthorized.attemptedRoute}
          attemptedPath={attemptedPath}
        />

        <UnauthorizedActions
          candidateVaults={candidateVaults}
          selectedVaultId={selectedVaultId}
          switchVaultAndRetryLabel={t.common.unauthorized.switchVaultAndRetry}
          goToDashboardLabel={t.common.unauthorized.goToDashboard}
          openHelpCenterLabel={t.common.unauthorized.openHelpCenter}
          onSelectedVaultChange={setSelectedVaultId}
          onSwitchVaultAndRetry={switchVaultAndRetry}
          onGoToDashboard={() => navigate({ to: '/' })}
        />
      </div>
    </div>
  );
};

export default Unauthorized;
