import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Search, AlertTriangle, Plus, X, ClipboardPlus } from 'lucide-react';
import axios from 'axios';

type RegisterRecord = { id: string; patient: string; age: number; village: string; date: string; status: string; register_type: string; ai_flag: string | null; data: Record<string, unknown> };
type Patient = { id: number; name: string; age: number; household_id: string; village: string };

const ALL_REGISTERS = [
  "Children 0-5 Years", "Adolescents 9-19 Years", "Newly Married Couples",
  "Pregnancy / Antenatal", "Delivery / Postnatal", "Immunization",
  "Family Planning", "NHD", "VHNC", "NCD", "Communicable Diseases",
  "Seasonal Diseases", "National Programmes"
];

const ILLUSTRATIVE_DETAILS: Record<string, string> = {
  'Children 0-5 Years': 'Growth check: 9.2 kg · nutrition counselling completed · next check in 30 days',
  'Adolescents 9-19 Years': 'Wellness visit · nutrition and menstrual health counselling · screening offered',
  'Newly Married Couples': 'Couple counselling · family planning options discussed · follow-up requested',
  'Pregnancy / Antenatal': 'ANC visit 2 · blood pressure and weight recorded · next check scheduled',
  'Delivery / Postnatal': 'Postnatal day 7 · mother and newborn check · feeding support provided',
  'Immunization': 'Routine immunization reviewed · next dose due in 4 weeks',
  'Family Planning': 'Counselling completed · method preference recorded · follow-up in 30 days',
  NHD: 'Household health visit · sanitation and nutrition needs reviewed',
  VHNC: 'Committee meeting · village health priorities and actions reviewed',
  NCD: 'Blood pressure screening · lifestyle counselling · repeat check advised',
  'Communicable Diseases': 'Fever assessment · warning signs explained · review advised if symptoms persist',
  'Seasonal Diseases': 'Seasonal illness prevention discussed · safe water guidance shared',
  'National Programmes': 'Programme eligibility reviewed · referral information shared',
};

export default function Registers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('type') || "NCD";
  const [records, setRecords] = useState<RegisterRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [details, setDetails] = useState('');
  const [aiFlag, setAiFlag] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadRegisters = async () => {
      try {
        const [recordResponse, patientResponse] = await Promise.all([
          axios.get<RegisterRecord[]>('/api/records'),
          axios.get<Patient[]>('/api/patients'),
        ]);
        setRecords(recordResponse.data);
        setPatients(patientResponse.data);
      } catch {
        setError('Could not load register records. Check the API connection and try again.');
      }
    };
    void loadRegisters();
  }, []);

  const filteredRecords = records.filter((record) =>
    record.register_type === activeTab && `${record.id} ${record.patient} ${record.village} ${JSON.stringify(record.data)}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const handleAddRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!patientId) return;
    setError('');
    setIsSaving(true);
    try {
      await axios.post('/api/records', {
        patient_id: Number(patientId),
        register_type: activeTab,
        data: { notes: details.trim() },
        ai_flag: aiFlag.trim() || null,
      });
      const response = await axios.get<RegisterRecord[]>('/api/records');
      setRecords(response.data);
      setSearch('');
      setIsAddOpen(false);
      setDetails('');
      setAiFlag('');
    } catch {
      setError('Could not save this register entry. Check the patient and details, then try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">FIELD RECORDS</p><h2 className="text-2xl font-bold text-slate-800">ASHA Registers</h2></div>
        <button onClick={() => { setError(''); setPatientId(patients[0] ? String(patients[0].id) : ''); setIsAddOpen(true); }} className="inline-flex items-center gap-2 bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover">
          <Plus size={17} /> Add record
        </button>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-white rounded-lg shadow-sm border p-2 flex-shrink-0">
          <div className="space-y-1">
            {ALL_REGISTERS.map(reg => (
              <button
                key={reg}
                onClick={() => setSearchParams({ type: reg })}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === reg ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {reg}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div><h3 className="flex items-center text-xl font-bold">
              <FileText className="mr-2 text-primary" /> {activeTab} Records
            </h3><p className="mt-1 text-xs text-slate-500">{filteredRecords.length} saved {filteredRecords.length === 1 ? 'record' : 'records'}</p></div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records..." className="pl-9 pr-4 py-2 border rounded-md text-sm" />
            </div>
          </div>

          {error && <p role="alert" className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <aside className="mb-5 grid gap-2 border border-dashed border-slate-300 bg-slate-50/70 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Illustrative entry · {activeTab}</p><p className="m-0 text-xs leading-5 text-slate-600">{ILLUSTRATIVE_DETAILS[activeTab] ?? 'A sample field entry for this register.'}</p></div>
            <span className="w-fit border border-slate-300 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">EXAMPLE ONLY · NOT SAVED</span>
          </aside>

          {filteredRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Record ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Visit details</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">AI Review</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredRecords.map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{rec.id}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{rec.patient} ({rec.age})</td>
                      <td className="max-w-sm px-4 py-3 text-sm text-slate-600">{String(rec.data?.notes ?? (Object.entries(rec.data ?? {}).map(([key, value]) => `${key.replaceAll('_', ' ')}: ${String(value)}`).join(' · ') || 'Visit recorded'))}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{rec.date}</td>
                      <td className="px-4 py-3 text-sm">
                        {rec.ai_flag ? (
                          <span className="inline-flex items-center text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-xs font-medium">
                            <AlertTriangle className="w-3 h-3 mr-1" /> {rec.ai_flag}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Clear</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          rec.status === 'Validated' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : search ? (
            <div className="py-10 text-center text-slate-500"><Search className="mx-auto mb-3 h-8 w-8 text-slate-300" /><p>No saved records match this search.</p></div>
          ) : (
            <div className="py-5">
              <div className="flex flex-col items-center justify-center px-4 py-7 text-center text-slate-500">
                <ClipboardPlus className="mb-3 h-9 w-9 text-primary/60" />
                <p className="font-semibold text-slate-700">No saved entries yet</p>
                <p className="mt-1 max-w-sm text-sm">Add a record from a household visit to build this register.</p>
                <button onClick={() => { setPatientId(patients[0] ? String(patients[0].id) : ''); setIsAddOpen(true); }} className="mt-4 inline-flex items-center gap-2 border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5"><Plus size={16} /> Add record</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsAddOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="add-register-record-title" className="w-full max-w-xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between">
              <div><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">{activeTab}</p><h3 id="add-register-record-title" className="text-xl font-bold text-slate-900">Add register record</h3><p className="mt-1 text-sm text-slate-500">Save details from a patient visit.</p></div>
              <button type="button" aria-label="Close" onClick={() => setIsAddOpen(false)} className="p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            {patients.length === 0 ? (
              <div className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Add a patient before creating a register entry. The illustrative example is not saved patient data.</div>
            ) : (
              <form onSubmit={handleAddRecord} className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">Patient
                  <select required value={patientId} onChange={(event) => setPatientId(event.target.value)} className="mt-1 block w-full border border-slate-300 bg-white px-3 py-2.5">
                    {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} · {patient.age} · {patient.household_id}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">Visit details
                  <textarea required minLength={3} maxLength={3000} rows={5} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Enter measurements, counselling, referrals, or follow-up notes..." className="mt-1 block w-full resize-y border border-slate-300 px-3 py-2.5" />
                </label>
                <label className="block text-sm font-medium text-slate-700">Review flag <span className="font-normal text-slate-400">(optional)</span>
                  <input maxLength={300} value={aiFlag} onChange={(event) => setAiFlag(event.target.value)} placeholder="e.g. follow-up needed" className="mt-1 block w-full border border-slate-300 px-3 py-2.5" />
                </label>
                {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                <div className="flex justify-end gap-3 border-t pt-4">
                  <button type="button" onClick={() => setIsAddOpen(false)} className="border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button>
                  <button type="submit" disabled={isSaving} className="bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? 'Saving...' : 'Save record'}</button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
