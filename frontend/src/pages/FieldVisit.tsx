import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Mic, Camera, FileText, CheckCircle, AlertTriangle, User, Plus, LoaderCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';

type Patient = { id: number; name: string; age: number; gender: string; household_id: string };
type VisitForm = { name: string; age: string; condition: string; bp: string; followUp: string };
type SpeechResult = { 0: { transcript: string }; isFinal: boolean };
type SpeechEvent = { results: ArrayLike<SpeechResult> };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechWindow = Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };

const REGISTERS = [
  "Children 0-5 Years", "Adolescents 9-19 Years", "Newly Married Couples",
  "Pregnancy / Antenatal", "Delivery / Postnatal", "Immunization",
  "Family Planning", "NHD", "VHNC", "NCD", "Communicable Diseases",
  "Seasonal Diseases", "National Programmes"
];

const getSuggestedRegister = (text: string) => {
  if (/pregnan|antenatal|\banc\b|delivery|postnatal/i.test(text)) return 'Pregnancy / Antenatal';
  if (/immuni[sz]|vaccin/i.test(text)) return 'Immunization';
  if (/child|infant|under five/i.test(text)) return 'Children 0-5 Years';
  if (/diabet|hypertension|\bbp\b|blood pressure|ncd/i.test(text)) return 'NCD';
  return 'NCD';
};

const extractVisitForm = (text: string): VisitForm => {
  const firstSegment = text.split(/[,;\n.!?]/)[0]?.trim() ?? '';
  const name = firstSegment.replace(/^(?:patient\s+)?(?:name\s*)?(?:is|:)?\s*/i, '').trim();
  const safeName = name.length > 1 && name.split(/\s+/).length <= 5 && !/^(today|visited|patient|bp|blood|pregnant)\b/i.test(name)
    ? name
    : '';
  const age = text.match(/\b(\d{1,3})\s*(?:years?|yrs?|yo|year old)\b/i)?.[1] ?? '';
  const pressure = text.match(/(?:bp|blood pressure)\s*(?:is|of|at)?\s*(\d{2,3})\s*(?:\/|by|over)\s*(\d{2,3})/i);
  const condition = ['Diabetes', 'Hypertension', 'Malaria', 'Tuberculosis', 'Anaemia'].find((item) => new RegExp(item === 'Tuberculosis' ? 'tb|tuberculosis' : item, 'i').test(text)) ?? '';

  return {
    name: safeName,
    age,
    condition,
    bp: pressure ? `${pressure[1]}/${pressure[2]}` : '',
    followUp: '',
  };
};

export default function FieldVisit() {
  const [searchParams] = useSearchParams();
  const requestedPatientId = searchParams.get('patient');
  const [step, setStep] = useState(1);
  const [household, setHousehold] = useState('HH1025');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientError, setPatientError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [captureProgress, setCaptureProgress] = useState('');
  const [captureError, setCaptureError] = useState('');
  const [transcript, setTranscript] = useState('');
  const [suggestedRegister, setSuggestedRegister] = useState('');
  const [aiFlag, setAiFlag] = useState<{ type: 'warning'; message: string } | null>(null);
  const [voiceLanguage, setVoiceLanguage] = useState('en-IN');
  const [formData, setFormData] = useState<VisitForm>({
    name: '', age: '', condition: '', bp: '', followUp: ''
  });
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const response = await axios.get<Patient[]>('/api/patients');
        setPatients(response.data);
        if (requestedPatientId) {
          const selectedPatient = response.data.find((item) => String(item.id) === requestedPatientId);
          if (selectedPatient) {
            setPatient(selectedPatient);
            setHousehold(selectedPatient.household_id);
            setFormData({ name: selectedPatient.name, age: String(selectedPatient.age), condition: '', bp: '', followUp: '' });
            setStep(2);
          }
        }
      } catch {
        setPatientError('Could not load patients. Check the API connection and try again.');
      }
    };
    void loadPatients();
    return () => recognitionRef.current?.stop();
  }, [requestedPatientId]);

  const applyCapturedText = (text: string) => {
    const extracted = extractVisitForm(text);
    setTranscript(text);
    setFormData((current) => ({
      name: extracted.name || current.name || patient?.name || '',
      age: extracted.age || current.age || (patient ? String(patient.age) : ''),
      condition: extracted.condition || current.condition,
      bp: extracted.bp || current.bp,
      followUp: current.followUp,
    }));
    const register = getSuggestedRegister(text);
    setSuggestedRegister(register);
    const pressure = extracted.bp.split('/').map(Number);
    setAiFlag(pressure.length === 2 && (pressure[0] >= 140 || pressure[1] >= 90)
      ? { type: 'warning', message: `Blood pressure ${extracted.bp} is elevated. Please verify and refer as needed.` }
      : null);
    setCaptureError('');
    setStep(3);
  };

  const handleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    setCaptureError('');
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setCaptureError('Speech recognition is not available in this browser. Type the visit note below instead.');
      return;
    }

    const recognition = new Recognition();
    recognition.lang = voiceLanguage;
    recognition.interimResults = true;
    recognition.continuous = false;
    let spokenText = '';
    recognition.onresult = (event) => {
      spokenText = Array.from(event.results).map((result) => result[0].transcript).join(' ').trim();
      setTranscript(spokenText);
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      setCaptureError(event.error === 'not-allowed'
        ? 'Microphone access was blocked. Allow microphone access in your browser and try again.'
        : `Voice capture stopped (${event.error}). You can try again or type the note.`);
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      if (spokenText) applyCapturedText(spokenText);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setCaptureError('Could not start microphone capture. Check browser permissions and try again.');
    }
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const image = event.target.files?.[0];
    event.target.value = '';
    if (!image) return;
    if (!image.type.startsWith('image/')) {
      setCaptureError('Choose an image file to scan.');
      return;
    }

    setCaptureError('');
    setIsScanning(true);
    setCaptureProgress('Loading text recognition...');
    let worker: Awaited<ReturnType<typeof import('tesseract.js').createWorker>> | undefined;
    try {
      const { createWorker } = await import('tesseract.js');
      worker = await createWorker('eng', undefined, {
        logger: ({ status, progress }) => {
          if (status === 'recognizing text') setCaptureProgress(`Reading image ${Math.round(progress * 100)}%`);
          else if (status) setCaptureProgress(status);
        },
      });
      const result = await worker.recognize(image);
      if (!result.data.text.trim()) {
        setCaptureError('No readable text was found. Try a brighter, flatter photo with the page filling the frame.');
        return;
      }
      setCaptureProgress('Text found. Review the extracted fields.');
      applyCapturedText(result.data.text.trim());
    } catch {
      setCaptureError('Could not scan this image. Try a clearer photo, or enter the visit note manually.');
    } finally {
      if (worker) await worker.terminate();
      setIsScanning(false);
    }
  };

  const handleManualInput = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setTranscript(event.target.value);
    setSuggestedRegister(event.target.value.trim() ? getSuggestedRegister(event.target.value) : '');
  };

  const submitRecord = async () => {
    if (!patient) return;
    setCaptureError('');
    setIsSaving(true);
    try {
      await axios.post('/api/records', {
        patient_id: patient.id,
        register_type: suggestedRegister || 'NCD',
        ai_flag: aiFlag?.message ?? null,
        data: { ...formData, transcript },
      });
      setStep(4);
    } catch {
      setCaptureError('The visit could not be saved. Check the API connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Stepper */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6 flex justify-between items-center text-sm font-medium">
        <div className={`flex items-center ${step >= 1 ? 'text-primary' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${step >= 1 ? 'bg-primary text-white' : 'bg-slate-100'}`}>1</div>
          Select Patient
        </div>
        <div className="w-12 h-0.5 bg-slate-200"></div>
        <div className={`flex items-center ${step >= 2 ? 'text-primary' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${step >= 2 ? 'bg-primary text-white' : 'bg-slate-100'}`}>2</div>
          Data Entry
        </div>
        <div className="w-12 h-0.5 bg-slate-200"></div>
        <div className={`flex items-center ${step >= 3 ? 'text-primary' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${step >= 3 ? 'bg-primary text-white' : 'bg-slate-100'}`}>3</div>
          Verify & AI Check
        </div>
        <div className="w-12 h-0.5 bg-slate-200"></div>
        <div className={`flex items-center ${step >= 4 ? 'text-primary' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${step >= 4 ? 'bg-primary text-white' : 'bg-slate-100'}`}>4</div>
          Submit
        </div>
      </div>

      {step === 1 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
          <h3 className="text-lg font-bold">1. Select Household & Patient</h3>
          <div>
            <label className="block text-sm font-medium text-slate-700">Search Household ID</label>
            <input type="text" className="mt-1 block w-full border rounded-md p-2" placeholder="e.g. HH1025" value={household} onChange={(event) => setHousehold(event.target.value)} />
          </div>
          {patientError && <p role="alert" className="text-sm text-red-700">{patientError}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {patients.filter((item) => item.household_id.toLowerCase() === household.trim().toLowerCase()).map((item) => (
              <button key={item.id} className="border border-slate-200 p-4 text-left hover:border-primary hover:bg-blue-50" onClick={() => { setPatient(item); setFormData({ name: item.name, age: String(item.age), condition: '', bp: '', followUp: '' }); setStep(2); }}>
                <span className="flex items-center gap-3"><User className="text-primary" /><span><strong className="block text-slate-800">{item.name}</strong><span className="text-sm text-slate-500">{item.age} years · {item.gender}</span></span></span>
              </button>
            ))}
          </div>
          {patients.filter((item) => item.household_id.toLowerCase() === household.trim().toLowerCase()).length === 0 && (
            <p className="py-3 text-sm text-slate-500">No patients found for this household.</p>
          )}
          <Link to="/patients" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover"><Plus size={17} /> Add a patient</Link>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-6">
          <div className="flex justify-between">
            <h3 className="text-lg font-bold">2. Data Entry for {patient?.name}</h3>
            <button onClick={()=>setStep(1)} className="text-sm text-slate-500 hover:text-slate-700">Back</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={handleVoiceInput}
              disabled={isScanning}
              type="button"
              className={`p-6 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-all ${isListening ? 'border-red-500 bg-red-50' : 'border-primary hover:bg-blue-50'}`}
            >
              <div className={`p-4 rounded-full mb-3 ${isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'bg-blue-100 text-primary'}`}>
                <Mic className="h-8 w-8" />
              </div>
              <span className="font-bold">{isListening ? 'Stop listening' : 'Speak visit notes'}</span>
              <span className="mt-1 text-sm text-slate-500">{isListening ? 'Tap to stop and review' : 'Speech will fill the review form'}</span>
            </button>

            <div className="flex flex-col gap-3">
              <input ref={imageInputRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={handleImageChange} />
              <button type="button" disabled={isScanning || isListening} onClick={() => imageInputRef.current?.click()} className="flex min-h-28 flex-1 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-5 hover:border-primary hover:bg-blue-50 disabled:opacity-60">
                <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  {isScanning ? <LoaderCircle className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
                </span>
                <span className="font-bold">{isScanning ? 'Scanning photo...' : 'Scan a register photo'}</span>
                <span className="mt-1 text-sm text-slate-500">Choose an image or use your camera</span>
              </button>
              <label className="flex items-center justify-between gap-3 text-sm text-slate-600">
                Spoken language
                <select value={voiceLanguage} onChange={(event) => setVoiceLanguage(event.target.value)} className="border border-slate-300 bg-white px-2 py-1.5">
                  <option value="en-IN">English (India)</option>
                  <option value="hi-IN">Hindi</option>
                  <option value="te-IN">Telugu</option>
                </select>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="visit-note" className="block text-sm font-medium text-slate-700">Or enter visit notes</label>
            <textarea 
              id="visit-note"
              className="mt-1 w-full border rounded-md p-2 h-24"
              value={transcript}
              onChange={handleManualInput}
              placeholder="e.g., Lakshmi Devi, 26 years, first pregnancy, ANC visit..."
            ></textarea>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">Review every extracted field before saving. First photo scan downloads the OCR language data.</p>
              <button type="button" disabled={!transcript.trim() || isScanning || isListening} onClick={() => applyCapturedText(transcript)} className="bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Review note</button>
            </div>
          </div>

          {captureProgress && <p role="status" className="text-sm text-slate-600">{captureProgress}</p>}
          {captureError && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{captureError}</p>}
          
          {suggestedRegister && (
            <div className="bg-blue-50 p-4 rounded-md border border-blue-100 flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="text-primary mr-3" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Suggested Register</p>
                  <p className="font-bold text-primary">{suggestedRegister}</p>
                </div>
              </div>
              <span className="text-sm font-medium text-primary">Suggested from note</span>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-6">
          <div className="flex justify-between">
            <h3 className="text-lg font-bold">3. Verify AI Extracted Information</h3>
            <button onClick={()=>setStep(2)} className="text-sm text-slate-500 hover:text-slate-700">Back</button>
          </div>
          
          <div className="bg-slate-50 border p-3 rounded text-sm text-slate-600 flex items-center">
             <AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />
             Extracted details may be incomplete. Review them against your notes before submitting.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600">Name</label>
              <input type="text" className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm text-slate-600">Age</label>
              <input type="number" min="0" max="130" className="w-full border p-2 rounded" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm text-slate-600">Blood Pressure</label>
              <input type="text" className={`w-full border p-2 rounded ${aiFlag ? 'border-red-500 bg-red-50' : ''}`} value={formData.bp} onChange={e => setFormData({...formData, bp: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm text-slate-600">Condition</label>
              <input type="text" className="w-full border p-2 rounded" value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm text-slate-600">Follow-up date</label>
              <input type="date" className="w-full border p-2 rounded" value={formData.followUp} onChange={e => setFormData({...formData, followUp: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm text-slate-600">Register Selected</label>
              <select className="w-full border p-2 rounded" value={suggestedRegister} onChange={e=>setSuggestedRegister(e.target.value)}>
                {REGISTERS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {aiFlag && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
               <div className="flex items-center">
                 <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                 <span className="font-bold text-red-700">AI Review Required</span>
               </div>
               <p className="mt-1 text-red-600 text-sm">{aiFlag.message}</p>
            </div>
          )}

          {captureError && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{captureError}</p>}
          <div className="flex gap-4 pt-4 border-t">
            <button onClick={submitRecord} disabled={isSaving || !formData.name.trim()} className="flex-1 bg-green-600 text-white p-3 rounded-md shadow hover:bg-green-700 flex items-center justify-center font-bold disabled:opacity-60">
              <CheckCircle className="mr-2" /> Confirm & Submit to ANM
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="bg-white p-8 rounded-lg shadow-sm border text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-500">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">Record Submitted</h3>
          <p className="text-slate-600">The record has been saved and sent for ANM Validation.</p>
          
          <div className="bg-slate-50 p-4 rounded text-left inline-block mt-4 w-full max-w-md">
            <p><strong>Patient:</strong> {formData.name}</p>
            <p><strong>Register:</strong> {suggestedRegister}</p>
            <p><strong>Status:</strong> <span className="text-amber-600">Pending ANM Review</span></p>
          </div>

          <div className="pt-6">
            <button onClick={() => {setStep(1); setPatient(null); setFormData({ name: '', age: '', condition: '', bp: '', followUp: '' }); setTranscript(''); setSuggestedRegister(''); setAiFlag(null); setCaptureError(''); setCaptureProgress('');}} className="bg-primary text-white px-6 py-2 rounded-md shadow hover:bg-primary-hover">
              Start Another Visit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
