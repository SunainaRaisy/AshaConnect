import { useState, useEffect, type FormEvent } from 'react';
import { Search, User, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

type Patient = { id: number; name: string; age: number; gender: string; household_id: string; village: string; mobile?: string | null; abha_id?: string | null; registers: string[] };
type Household = { id: string; village: string };
type PatientForm = { name: string; age: string; gender: string; household_id: string; village: string; mobile: string; abha_id: string };

const emptyForm: PatientForm = { name: '', age: '', gender: 'Female', household_id: '', village: '', mobile: '', abha_id: '' };

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<PatientForm>(emptyForm);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [patientResponse, householdResponse] = await Promise.all([
          axios.get<Patient[]>('/api/patients'),
          axios.get<Household[]>('/api/households'),
        ]);
        setPatients(patientResponse.data);
        setHouseholds(householdResponse.data);
        if (householdResponse.data.length > 0) {
          setForm((current) => current.household_id ? current : {
            ...current,
            household_id: householdResponse.data[0].id,
            village: householdResponse.data[0].village,
          });
        }
      } catch {
        setError('Could not load patients. Check that the API server is running and try again.');
      } finally {
        setIsLoading(false);
      }
    };
    void loadData();
  }, []);

  const filteredPatients = patients.filter((patient) =>
    [patient.name, patient.household_id, patient.village, patient.mobile, patient.abha_id]
      .some((value) => value?.toLowerCase().includes(search.toLowerCase().trim())),
  );

  const handleHouseholdChange = (householdId: string) => {
    const selectedHousehold = households.find((household) => household.id === householdId);
    setForm((current) => ({ ...current, household_id: householdId, village: selectedHousehold?.village ?? '' }));
  };

  const handleCreatePatient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      const response = await axios.post<Patient>('/api/patients', {
        ...form,
        age: Number(form.age),
        village: form.village,
      });
      setPatients((current) => [...current, response.data].sort((left, right) => left.name.localeCompare(right.name)));
      setForm({ ...emptyForm, household_id: form.household_id, village: form.village });
      setIsFormOpen(false);
    } catch (requestError) {
      const message = axios.isAxiosError<{ detail?: string }>(requestError)
        ? requestError.response?.data?.detail
        : undefined;
      setError(message ?? 'Could not save this patient. Please check the details and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Patients</h2>
        <button onClick={() => { setError(''); setIsFormOpen(true); }} className="bg-primary text-white px-4 py-2 rounded-md shadow hover:bg-primary-hover flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Add Patient
        </button>
      </div>

      {error && !isFormOpen && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 p-3">{error}</p>}
      
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, household, ABHA ID or mobile..."
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-primary focus:border-primary"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Patient</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Demographics</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Active Registers</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">Loading patients...</td></tr>
            ) : filteredPatients.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">No patients found.</td></tr>
            ) : filteredPatients.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 cursor-pointer">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-slate-900">{p.name}</div>
                      <div className="text-sm text-slate-500">ID: {p.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {p.age} yrs • {p.gender}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-900">{p.household_id}</div>
                  <div className="text-sm text-slate-500">{p.village}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {p.registers.map(tag => (
                    <span key={tag} className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {tag}
                    </span>
                  ))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link to={`/visit?patient=${p.id}`} className="text-primary hover:text-primary-hover">Start Visit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsFormOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="add-patient-title" className="w-full max-w-xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 id="add-patient-title" className="text-xl font-bold text-slate-900">Add patient</h3>
                <p className="mt-1 text-sm text-slate-500">Create a patient record in the selected household.</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setIsFormOpen(false)} className="p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            {households.length === 0 ? (
              <p role="alert" className="text-sm text-amber-800 bg-amber-50 p-3">Create a household before adding a patient.</p>
            ) : (
              <form onSubmit={handleCreatePatient} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700 sm:col-span-2">Patient name
                    <input required maxLength={120} autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 block w-full border border-slate-300 px-3 py-2" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">Age
                    <input required type="number" min="0" max="130" value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })} className="mt-1 block w-full border border-slate-300 px-3 py-2" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">Gender
                    <select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })} className="mt-1 block w-full border border-slate-300 px-3 py-2">
                      <option>Female</option><option>Male</option><option>Other</option>
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">Household
                    <select required value={form.household_id} onChange={(event) => handleHouseholdChange(event.target.value)} className="mt-1 block w-full border border-slate-300 px-3 py-2">
                      {households.map((household) => <option key={household.id} value={household.id}>{household.id} · {household.village}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">Mobile number
                    <input type="tel" value={form.mobile} onChange={(event) => setForm({ ...form, mobile: event.target.value })} className="mt-1 block w-full border border-slate-300 px-3 py-2" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700 sm:col-span-2">ABHA ID <span className="font-normal text-slate-400">(optional)</span>
                    <input value={form.abha_id} onChange={(event) => setForm({ ...form, abha_id: event.target.value })} className="mt-1 block w-full border border-slate-300 px-3 py-2" />
                  </label>
                </div>
                {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                <div className="flex justify-end gap-3 border-t pt-4">
                  <button type="button" onClick={() => setIsFormOpen(false)} className="border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button>
                  <button type="submit" disabled={isSaving} className="bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? 'Saving...' : 'Save patient'}</button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
