import React from 'react';
import { RotateCcw, Check, FileText, Video, Camera } from 'lucide-react';
import { MediaType } from '../../types';
import DatePicker from '../DatePicker';

interface CheckboxProps {
  label: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
  icon?: React.ReactNode;
}

const Checkbox: React.FC<CheckboxProps> = ({ label, count, checked, onChange, icon }) => (
  <button
    role="checkbox"
    aria-checked={checked}
    onClick={onChange}
    className="flex items-center gap-2.5 group outline-none text-left"
  >
    <div
      className={`w-4 h-4 rounded border transition-all flex items-center justify-center shrink-0 ${
        checked
          ? 'bg-primary border-primary shadow-sm'
          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 group-hover:border-primary/50'
      }`}
    >
      {checked && <Check size={12} className="text-white" strokeWidth={3} />}
    </div>
    {icon && <span className={`shrink-0 ${checked ? 'text-primary' : 'text-slate-400'}`}>{icon}</span>}
    <span
      className={`text-[11px] transition-colors truncate font-semibold ${
        checked
          ? 'text-slate-900 dark:text-white'
          : 'text-slate-500 dark:text-slate-400 group-hover:text-primary'
      }`}
    >
      {label}
      {typeof count === 'number' ? ` (${count})` : ''}
    </span>
  </button>
);

interface FilterOption {
  value: string;
  count: number;
}

interface TypeFilterOption {
  value: MediaType;
  count: number;
}

interface VaultFiltersProps {
  peopleOptions: FilterOption[];
  locationOptions: FilterOption[];
  eraOptions: FilterOption[];
  typeOptions: TypeFilterOption[];
  isLoadingOptions?: boolean;
  selectedPeople: string[];
  onPeopleChange: (person: string) => void;
  selectedLocations: string[];
  onLocationChange: (loc: string) => void;
  selectedEra: string | null;
  onEraChange: (era: string | null) => void;
  selectedTypes: MediaType[];
  onTypeChange: (type: MediaType) => void;
  startDate?: Date;
  onStartDateChange: (date: Date) => void;
  endDate?: Date;
  onEndDateChange: (date: Date) => void;
  onClear: () => void;
}

const mediaTypeConfig: Record<MediaType, { label: string; icon: React.ReactNode }> = {
  [MediaType.PHOTO]: { label: 'Photos', icon: <Camera size={14} /> },
  [MediaType.DOCUMENT]: { label: 'Documents', icon: <FileText size={14} /> },
  [MediaType.VIDEO]: { label: 'Videos', icon: <Video size={14} /> },
};

const VaultFilters: React.FC<VaultFiltersProps> = ({
  peopleOptions,
  locationOptions,
  eraOptions,
  typeOptions,
  isLoadingOptions = false,
  selectedPeople,
  onPeopleChange,
  selectedLocations,
  onLocationChange,
  selectedEra,
  onEraChange,
  selectedTypes,
  onTypeChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onClear,
}) => {
  const resolvedTypeOptions: TypeFilterOption[] = typeOptions.length
    ? typeOptions
    : (Object.values(MediaType) as MediaType[]).map((value) => ({ value, count: 0 }));

  return (
    <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 sm:p-8 animate-in fade-in slide-in-from-top-4 duration-300 shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8 sm:gap-12">
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">People</h3>
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-3">
            {peopleOptions.map((person) => (
              <Checkbox
                key={person.value}
                label={person.value}
                count={person.count}
                checked={selectedPeople.includes(person.value)}
                onChange={() => onPeopleChange(person.value)}
              />
            ))}
            {!peopleOptions.length && (
              <p className="text-[10px] text-slate-400">
                {isLoadingOptions ? 'Loading...' : 'No people tags found'}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4 md:border-l lg:border-none xl:border-l dark:border-slate-800 sm:pl-10 lg:pl-0 xl:pl-10">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Media Type</h3>
          <div className="grid grid-cols-1 gap-3">
            {resolvedTypeOptions.map((option) => (
              <Checkbox
                key={option.value}
                label={mediaTypeConfig[option.value].label}
                count={option.count}
                icon={mediaTypeConfig[option.value].icon}
                checked={selectedTypes.includes(option.value)}
                onChange={() => onTypeChange(option.value)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4 lg:border-l dark:border-slate-800 lg:pl-10">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Locations</h3>
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-3">
            {locationOptions.map((location) => (
              <Checkbox
                key={location.value}
                label={location.value}
                count={location.count}
                checked={selectedLocations.includes(location.value)}
                onChange={() => onLocationChange(location.value)}
              />
            ))}
            {!locationOptions.length && (
              <p className="text-[10px] text-slate-400">
                {isLoadingOptions ? 'Loading...' : 'No locations found'}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4 xl:border-l dark:border-slate-800 xl:pl-10 lg:col-span-2 xl:col-span-1">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date Range</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase">From</span>
              <DatePicker
                date={startDate}
                onChange={onStartDateChange}
                placeholder="Start date"
                className="scale-90 origin-left"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase">To</span>
              <DatePicker
                date={endDate}
                onChange={onEndDateChange}
                placeholder="End date"
                className="scale-90 origin-left"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:border-l dark:border-slate-800 lg:pl-10 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Era</h3>
            <div className="flex flex-wrap gap-2">
              {eraOptions.map((era) => (
                <button
                  key={era.value}
                  onClick={() => onEraChange(selectedEra === era.value ? null : era.value)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                    selectedEra === era.value
                      ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-500 hover:text-primary'
                  }`}
                >
                  {era.value} ({era.count})
                </button>
              ))}
              {!eraOptions.length && (
                <p className="text-[10px] text-slate-400">
                  {isLoadingOptions ? 'Loading...' : 'No eras found'}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClear}
            className="w-full py-4 bg-transparent border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 hover:text-primary"
          >
            <RotateCcw size={14} /> Reset Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default VaultFilters;
