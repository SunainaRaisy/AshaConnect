import { useState, useEffect, type FormEvent } from 'react';
import { Search, Home, Plus, X } from 'lucide-react';
import axios from 'axios';

type Household = { id: string; village: string; members: number; last_visit: string | null };

export default function Households() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [householdId, setHouseholdId] = useState('');
  const [village, setVillage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    axios.get<Household[]>('/api/households')
      .then((response) => setHouseholds(response.data))
      .catch(() => setError('Could not load households. Check the API connection and try again.'))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredHouseholds = households.filter((household) =>
    `${household.id} ${household.village}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      const response = await axios.post<Household>('/api/households', { id: householdId, village });
      setHouseholds((current) => [...current, response.data].sort((left, right) => left.id.localeCompare(right.id)));
      setHouseholdId('');
      setVillage('');
      setIsFormOpen(false);
    } catch (requestError) {
      const message = axios.isAxiosError<{ detail?: string }>(requestError) ? requestError.response?.data?.detail : undefined;
      setError(message ?? 'Could not save this household. Check the details and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Households</h2>
        <button onClick={() => { setError(''); setIsFormOpen(true); }} className="bg-primary text-white px-4 py-2 rounded-md shadow hover:bg-primary-hover flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Add Household
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by household ID or village..."
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-primary focus:border-primary"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {error && !isFormOpen && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? <p className="text-sm text-slate-500">Loading households...</p> : filteredHouseholds.length === 0 ? (
          <p className="col-span-full py-10 text-center text-sm text-slate-500">No households match this search.</p>
        ) : filteredHouseholds.map(hh => (
          <article key={hh.id} className="bg-white rounded-lg shadow-sm border p-5 transition-shadow hover:shadow-md">
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                <div className="bg-blue-50 p-2 rounded-md mr-3 text-primary">
                  <Home className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{hh.id}</h3>
                  <p className="text-sm text-slate-500">{hh.village}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between text-sm">
              <span className="text-slate-600">Members: <strong>{hh.members}</strong></span>
              <span className="text-slate-600">Last visit: {hh.last_visit ? new Date(`${hh.last_visit}T00:00:00`).toLocaleDateString() : 'Not yet recorded'}</span>
            </div>
          </article>
        ))}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsFormOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="add-household-title" className="w-full max-w-md bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between">
              <div><h3 id="add-household-title" className="text-xl font-bold text-slate-900">Add household</h3><p className="mt-1 text-sm text-slate-500">Create a household record for a new family.</p></div>
              <button type="button" aria-label="Close" onClick={() => setIsFormOpen(false)} className="p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">Household ID
                <input required minLength={2} maxLength={30} autoFocus value={householdId} onChange={(event) => setHouseholdId(event.target.value)} placeholder="e.g. HH1027" className="mt-1 block w-full border border-slate-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-slate-700">Village
                <input required maxLength={120} value={village} onChange={(event) => setVillage(event.target.value)} className="mt-1 block w-full border border-slate-300 px-3 py-2" />
              </label>
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <div className="flex justify-end gap-3 border-t pt-4">
                <button type="button" onClick={() => setIsFormOpen(false)} className="border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button>
                <button type="submit" disabled={isSaving} className="bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? 'Saving...' : 'Save household'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
