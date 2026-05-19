import { useState } from 'react';
import { UserFocus, Palette, Database, MagicWand, Sparkle, BellRinging, Spinner } from '@phosphor-icons/react';
import { sileo } from 'sileo';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { useMutation } from '@tanstack/react-query';
import axiosClient from '../services/axiosClient';
import { subscribeToPush } from '../lib/notifications';
import { useQueryClient } from '@tanstack/react-query';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('HEALTH');
  const [selectedColor, setSelectedColor] = useState('#B88F5B');
  const [grainEnabled, setGrainEnabled] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const { currentUser, activeVaultId, login } = useAuthStore();
  const queryClient = useQueryClient();

  const smartPurgeMutation = useMutation({
    mutationFn: () => axiosClient.post(`/vaults/${activeVaultId}/memories/purge/`)
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => axiosClient.put(`/vaults/${activeVaultId}/settings/`, data)
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => axiosClient.put(`/auth/profile/`, data)
  });

  const handleSmartPurge = async () => {
    const confirmed = window.confirm(
      "Execute Smart Purge?\n\n" +
      "The AI Curator will identify visually identical images and keep only the highest-resolution copy. " +
      "This will physically erase redundant files to optimize your vault. Proceed?"
    );

    if (!confirmed) return;

    sileo.promise(smartPurgeMutation.mutateAsync(), {
      loading: { title: "Deduplicating...", description: "Selecting highest-quality artifacts..." },
      success: (res) => {
        queryClient.invalidateQueries();
        const { purged, mb_saved } = res.data;
        return {
          title: "Vault Optimized",
          description: purged > 0
            ? `Successfully expunged ${purged} duplicates, reclaiming ${mb_saved} MB.`
            : "No visual redundancy detected. Your archive is pristine."
        };
      },
      error: { title: "Purge Failed" }
    });
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    updateSettingsMutation.mutate({ primary_hue: color }, {
      onSuccess: () => sileo.success({ title: "Palette Updated", description: `Museum hue changed.` })
    });
  };

  const handleSaveAccount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;

    sileo.promise(updateProfileMutation.mutateAsync({ fullName, email }), {
      loading: { title: "Saving..." },
      success: (res) => {
        login({ user: res.data, accessToken: useAuthStore.getState().accessToken!, refreshToken: useAuthStore.getState().refreshToken!, activeVaultId });
        return { title: "Identity Updated", description: "Your profile has been saved." };
      },
      error: { title: "Failed to update profile" }
    });
  };

  return (
    <div className="min-h-screen zone-light py-20 px-[clamp(24px,5vw,80px)]">
      <div className="max-w-[var(--max-width)] mx-auto flex flex-col lg:flex-row gap-12">

        <aside className="w-full lg:w-[240px] space-y-2">
          <h2 className="font-display text-xl uppercase tracking-widest mb-8 text-[var(--clr-ink)]">Curator Settings</h2>
          {[
            { id: 'ACCOUNT', label: 'Identity', icon: <UserFocus /> },
            { id: 'THEME', label: 'Appearance', icon: <Palette /> },
            { id: 'HEALTH', label: 'Vault Health', icon: <Database /> },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-ui font-bold text-[11px] uppercase tracking-[0.1em] transition-all ${
                activeTab === item.id ? 'bg-[var(--clr-gold)] text-white shadow-lg' : 'text-[var(--clr-dust)] hover:bg-[var(--clr-gold-muted)] hover:text-[var(--clr-gold-dark)]'
              }`}
            >
              <span className="text-lg">{item.icon}</span> {item.label}
            </button>
          ))}
        </aside>

        <main className="flex-1">
          <div className="bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">

            {activeTab === 'HEALTH' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                <header>
                  <div className="flex items-center gap-2 text-[var(--clr-gold-dark)] font-bold text-[10px] uppercase tracking-widest mb-2">
                    <MagicWand size={16} weight="fill" /> AI-Driven Optimization
                  </div>
                  <h3 className="font-display text-[1.75rem] text-[var(--clr-ink)]">Vault Storage Health</h3>
                  <p className="font-ui text-sm text-[var(--clr-dust)] mt-2">The AI curator continually analyzes your archive for visual redundancy and perceptual duplicates.</p>
                </header>

                <div className="p-6 bg-[var(--clr-paper)] rounded-3xl border-l-4 border-[var(--clr-info)] flex items-start gap-5">
                  <Database size={32} className="text-[var(--clr-info)] shrink-0" />
                  <div>
                    <p className="font-ui font-bold text-[14px] text-[var(--clr-ink)]">Smart Purge Ready</p>
                    <p className="font-ui text-[12px] text-[var(--clr-dust)] mt-1 leading-relaxed">
                      Executing a Smart Purge will command the AI to group identical burst-photos based on their perceptual hashes (pHash), deleting lesser-quality duplicates while preserving the sharpest image.
                    </p>
                  </div>
                </div>

                <div className="pt-8 border-t border-[var(--clr-aged)] flex justify-between items-center">
                   <div className="flex items-center gap-2 text-[var(--clr-gold)] font-bold text-[11px] uppercase tracking-widest">
                     <Sparkle size={14} weight="fill" /> Deduplication Engine
                   </div>
                   <Button variant="primary" onClick={handleSmartPurge} disabled={smartPurgeMutation.isPending}>
                     {smartPurgeMutation.isPending ? 'PURGING...' : 'START SMART PURGE'}
                   </Button>
                </div>
              </div>
            )}

            {activeTab === 'THEME' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                <header>
                  <h3 className="font-display text-[1.75rem] text-[var(--clr-ink)] uppercase tracking-widest">Gallery Aesthetics</h3>
                  <p className="font-ui text-sm text-[var(--clr-dust)] mt-2">Customize the visual tone of your private museum.</p>
                </header>

                <div className="space-y-6">
                  <p className="font-ui text-[11px] font-black uppercase tracking-widest text-[var(--clr-fog)]">Primary Hue</p>
                  <div className="flex gap-4">
                    {['#B88F5B', '#4A7C59', '#3A5F7A', '#8B3A3A', '#1E1A17'].map(color => (
                      <button
                        key={color}
                        onClick={() => handleColorChange(color)}
                        style={{ backgroundColor: color }}
                        className={`w-10 h-10 rounded-full border-4 shadow-lg transform transition-all active:scale-95 ${selectedColor === color ? 'border-white scale-110' : 'border-transparent opacity-60'}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-6 pt-10 border-t border-[var(--clr-aged)]">
                   <div className="flex items-center justify-between">
                     <div>
                       <p className="font-ui font-bold text-[14px] text-[var(--clr-ink)]">Dynamic Museum Grain</p>
                       <p className="font-ui text-[12px] text-[var(--clr-dust)]">Apply subtle film-grain overlays to the Light Zone.</p>
                     </div>
                     <div
                       onClick={() => {
                         setGrainEnabled(!grainEnabled);
                         updateSettingsMutation.mutate({ grain_enabled: !grainEnabled }, {
                           onSuccess: () => sileo.success({ title: "Grain Toggled", description: `Dynamic museum grain ${!grainEnabled ? 'enabled' : 'disabled'}.` })
                         });
                       }}
                       className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${grainEnabled ? 'bg-[var(--clr-gold)]' : 'bg-[var(--clr-aged)]'}`}
                     >
                         <motion.div animate={{ x: grainEnabled ? 24 : 0 }} className="w-4 h-4 bg-white rounded-full shadow-sm" />
                      </div>
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'ACCOUNT' && (
              <form onSubmit={handleSaveAccount} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header>
                  <h3 className="font-display text-[1.75rem] text-[var(--clr-ink)] uppercase tracking-widest">Curator Identity</h3>
                </header>
                <div className="flex items-center gap-6 mb-6">
                  <div className="relative group cursor-pointer" onClick={() => !isUploadingAvatar && document.getElementById('avatar-upload')?.click()}>
                    <img
                      src={(currentUser as any)?.avatar || `https://ui-avatars.com/api/?name=${currentUser?.fullName?.replace(' ', '+')}&background=B88F5B&color=fff`}
                      alt="Profile"
                      className={`w-24 h-24 rounded-full border-4 border-[var(--clr-gold)] shadow-lg object-cover transition-opacity ${isUploadingAvatar ? 'opacity-50' : ''}`}
                    />
                    <div className={`absolute inset-0 rounded-full bg-black/50 flex items-center justify-center transition-opacity ${isUploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {isUploadingAvatar ? <Spinner className="animate-spin text-white" size={24} /> : <span className="text-white text-xs font-ui font-bold uppercase">Change</span>}
                    </div>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploadingAvatar}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploadingAvatar(true);
                        const formData = new FormData();
                        formData.append('avatar', file);

                        await sileo.promise(
                          axiosClient.patch('/auth/profile/', formData),
                          {
                            loading: { title: "Uploading Identity..." },
                            success: (res) => {
                              login({ user: res.data, accessToken: useAuthStore.getState().accessToken!, refreshToken: useAuthStore.getState().refreshToken!, activeVaultId });
                              return { title: "Avatar Updated" };
                            },
                            error: { title: "Upload Failed" }
                          }
                        ).finally(() => setIsUploadingAvatar(false));
                      }}
                    />
                  </div>
                  <div>
                    <p className="font-display font-bold text-xl text-[var(--clr-ink)]">{currentUser?.fullName}</p>
                    <p className="font-ui text-sm text-[var(--clr-dust)]">{currentUser?.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-ui text-[10px] font-black uppercase text-[var(--clr-dust)]">Legal Name</label>
                    <input name="fullName" defaultValue={currentUser?.fullName} className="w-full bg-[var(--clr-paper)] rounded-full px-6 py-3 outline-none focus:ring-2 focus:ring-[var(--clr-gold)]" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-ui text-[10px] font-black uppercase text-[var(--clr-dust)]">Email Address</label>
                    <input name="email" type="email" defaultValue={currentUser?.email} className="w-full bg-[var(--clr-paper)] rounded-full px-6 py-3 outline-none focus:ring-2 focus:ring-[var(--clr-gold)]" />
                  </div>
                </div>

                <div className="pt-8 mt-4 border-t border-[var(--clr-aged)] flex justify-between items-center">
                  <div className="flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-full bg-[rgba(184,143,91,0.15)] flex items-center justify-center text-[var(--clr-gold)]">
                      <BellRinging size={20} weight="fill" />
                    </div>
                    <div>
                      <p className="font-ui font-bold text-[14px] text-[var(--clr-ink)]">Push Notifications</p>
                      <p className="font-ui text-[12px] text-[var(--clr-dust)]">Get pinged when AI curation or capsules finish processing.</p>
                    </div>
                  </div>
                  <Button variant="ghost" type="button" onClick={() => {
                    subscribeToPush()
                      .then(() => sileo.success({ title: "Alerts Enabled", description: "You will now receive museum notifications." }))
                      .catch(() => sileo.error({ title: "Failed", description: "Please allow notifications in your browser." }));
                  }}>
                    ENABLE ALERTS
                  </Button>
                </div>

                <div className="pt-6 border-t border-[var(--clr-aged)]">
                  <Button variant="primary" type="submit" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? 'SAVING...' : 'SAVE IDENTITY'}
                  </Button>
                </div>
              </form>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}