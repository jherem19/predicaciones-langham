import React, { useState, useRef, ChangeEvent, MouseEvent, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// Type declarations for global libraries
declare global {
  interface Window {
    jspdf: any;
    html2canvas: (element: HTMLElement, options?: any) => Promise<HTMLCanvasElement>;
  }
}

// Interfaces for component props and state
interface SermonData {
  passage: string;
  // Exegesis
  exe_verbs: string;
  exe_characters: string;
  exe_location: string;
  exe_editorial_context: string;
  exe_structure: string;
  exe_basic_questions: string;
  // Hermeneutics
  hist_dist: string;
  theological_bridge: string;
  // Homiletics
  sermon_heart: string;
  motivator: string;
  introduction: string;
  development: string;
  application: string;
  synthesis: string;
}

const initialSermonData: SermonData = {
    passage: '',
    exe_verbs: '',
    exe_characters: '',
    exe_location: '',
    exe_editorial_context: '',
    exe_structure: '',
    exe_basic_questions: '',
    hist_dist: '',
    theological_bridge: '',
    sermon_heart: '',
    motivator: '',
    introduction: '',
    development: '',
    application: '',
    synthesis: ''
};

const App = () => {
  const [step, setStep] = useState(1);
  const [sermonData, setSermonData] = useState<SermonData>(initialSermonData);
  const [passageText, setPassageText] = useState({ rvr1960: '', ntv: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingPassage, setIsFetchingPassage] = useState(false);
  const sermonContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          })
          .catch(err => {
            console.error('ServiceWorker registration failed: ', err);
          });
      });
    }
  }, []);

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSermonData(prev => ({ ...prev, [name]: value }));
  };
  
  const getAISuggestion = async (prompt: string): Promise<string> => {
      if (!process.env.API_KEY) {
          alert("API key no está configurada. Por favor, configura la variable de entorno API_KEY.");
          return "";
      }
      setIsLoading(true);
      try {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
          });
          return response.text;
      } catch (error) {
          console.error("Error fetching AI suggestion:", error);
          alert("Hubo un error al obtener la sugerencia. Revisa la consola para más detalles.");
          return "";
      } finally {
          setIsLoading(false);
      }
  };

  const handleAISuggestion = async (field: keyof SermonData, promptText: string) => {
      const suggestion = await getAISuggestion(promptText);
      if (suggestion) {
          setSermonData(prev => ({ ...prev, [field]: prev[field] ? `${prev[field]}\n\nSugerencia AI:\n${suggestion}` : `Sugerencia AI:\n${suggestion}` }));
      }
  };
  
  const totalSteps = 6;
  const stepTitles = ["Pasaje", "1. Exégesis", "2. Hermenéutica", "3. Homilética", "5. Revisión", "Finalizar"];

  const handleNext = async () => {
      if (step === 1 && sermonData.passage) {
          setIsFetchingPassage(true);
          const prompt = `Busca el siguiente pasaje bíblico: "${sermonData.passage}". Provee el texto en dos versiones: Reina-Valera 1960 (RVR1960) y Nueva Traducción Viviente (NTV). Formatea tu respuesta estrictamente como un objeto JSON con las claves "rvr1960" y "ntv". No incluyas nada más en tu respuesta, solo el objeto JSON.`;
          
          let responseText = '';
          try {
              const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
              });
              responseText = response.text;
              
              let cleanedText = responseText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
              const parsed = JSON.parse(cleanedText);
              setPassageText({
                  rvr1960: parsed.rvr1960 || 'No se pudo encontrar la versión RVR1960.',
                  ntv: parsed.ntv || 'No se pudo encontrar la versión NTV.'
              });
          } catch (e) {
              console.error("Failed to parse Bible passage response:", e, "Raw response:", responseText);
              setPassageText({
                  rvr1960: 'No se pudo obtener el pasaje en RVR1960. Inténtelo de nuevo.',
                  ntv: 'No se pudo obtener el pasaje en NTV.'
              });
          } finally {
              setIsFetchingPassage(false);
          }
      }
      setStep(s => Math.min(totalSteps, s + 1));
  };
  
  const goToStep = (targetStep: number) => {
      setStep(targetStep);
  };
  
  const resetSermon = () => {
      setSermonData(initialSermonData);
      setPassageText({ rvr1960: '', ntv: '' });
      setStep(1);
  };

  const downloadPdf = async () => {
    if (typeof window.html2canvas !== 'function') {
        alert("La librería de generación de PDF (html2canvas) no se cargó correctamente. Por favor, recarga la página e inténtalo de nuevo.");
        console.error("html2canvas is not available or not a function", window.html2canvas);
        return;
    }
    const { jsPDF } = window.jspdf;
    const content = sermonContentRef.current;
    if (!content) return;

    alert("Se generará un PDF con el contenido del sermón. Este proceso puede tardar unos segundos.");

    try {
        const canvas = await window.html2canvas(content, { scale: 2 });
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasHeight / canvasWidth;
        const imgHeight = pdfWidth * ratio;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(canvas, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(canvas, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
        }
        
        pdf.save(`sermon_${sermonData.passage.replace(/\s|:/g, '_') || 'nuevo'}.pdf`);
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Hubo un error al generar el PDF. Por favor, inténtelo de nuevo.");
    }
  };
  
  const renderStep = () => {
    const commonProps = {
        sermonData,
        handleInputChange,
        handleAISuggestion,
        isLoading,
    };
    
    const passageDisplay = passageText.rvr1960 && (
        <PassageDisplay rvr1960={passageText.rvr1960} ntv={passageText.ntv} />
    );

    switch(step) {
      case 1: return <StepInitial sermonData={sermonData} handleInputChange={handleInputChange} />;
      case 2: return <div>{passageDisplay}<StepExegesis {...commonProps}/></div>;
      case 3: return <div>{passageDisplay}<StepHermeneutics {...commonProps}/></div>;
      case 4: return <div>{passageDisplay}<StepHomiletics {...commonProps} /></div>;
      case 5: return <StepReview sermonData={sermonData} passageText={passageText} handleInputChange={handleInputChange} />;
      case 6: return <StepFinal goToStep={goToStep} resetSermon={resetSermon} downloadPdf={downloadPdf} />;
      default: return <StepInitial sermonData={sermonData} handleInputChange={handleInputChange} />;
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      <header className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">Asistente de Preparación de Sermones</h1>
        <p className="text-lg text-gray-600">Una guía paso a paso para sermones bíblicos impactantes.</p>
      </header>
      
      <div className="mb-8">
        <div className="flex items-center justify-center">
          {stepTitles.map((title, index) => {
            const stepNumber = index + 1;
            const isActive = step === stepNumber;
            return(
            <React.Fragment key={index}>
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm md:text-base font-bold border-2 transition-all duration-300 ${isActive ? 'step-active' : (step > stepNumber ? 'step-completed' : 'step-inactive')}`}>
                {step > stepNumber ? '✓' : stepNumber}
              </div>
              {index < stepTitles.length -1 && <div className={`flex-auto border-t-2 transition-all duration-300 ${step > stepNumber ? 'border-green-600' : 'border-gray-300'}`}></div>}
            </React.Fragment>
            )
          })}
        </div>
      </div>
      
      <main className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-gray-200">
        {renderStep()}
      </main>
      
      <footer className="mt-8 flex justify-between items-center">
        <button 
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1 || step === totalSteps}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg shadow hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Anterior
        </button>
        {step < totalSteps && (
           <button 
             onClick={handleNext}
             disabled={isFetchingPassage}
             className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
           >
             {isFetchingPassage ? 'Buscando Pasaje...' : (step === totalSteps - 1 ? 'Confirmar y Finalizar' : 'Siguiente')}
           </button>
        )}
      </footer>
      {/* Hidden div for clean PDF generation */}
       <div className="absolute -left-full">
         <div ref={sermonContentRef}>
             <PrintableSermon sermonData={sermonData} passageText={passageText} />
         </div>
       </div>
    </div>
  );
};

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
    <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-700 border-b-2 border-blue-200 pb-2 mb-4">{title}</h3>
        {children}
    </div>
);

interface TipProps {
  children: React.ReactNode;
}

const Tip: React.FC<TipProps> = ({ children }) => (
    <div className="bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800 p-4 rounded-r-lg my-4">
        <p><span className="font-bold">💡 Tip:</span> {children}</p>
    </div>
);

interface AIButtonProps {
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  isLoading: boolean;
}

const AIButton: React.FC<AIButtonProps> = ({ onClick, isLoading }) => (
    <button onClick={onClick} disabled={isLoading} className="mt-2 px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg shadow-sm hover:bg-indigo-600 disabled:bg-indigo-300 transition-all flex items-center">
      {isLoading ? (
        <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generando...
        </>
      ) : '✨ Obtener Sugerencia IA'}
    </button>
);

interface PassageDisplayProps {
    rvr1960: string;
    ntv: string;
}

const PassageDisplay: React.FC<PassageDisplayProps> = ({ rvr1960, ntv }) => {
    const [version, setVersion] = useState<'rvr1960' | 'ntv'>('rvr1960');
    return (
        <div className="bg-gray-100 p-4 rounded-lg mb-8 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-gray-700">Pasaje Bíblico</h3>
                <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg">
                    <button onClick={() => setVersion('rvr1960')} className={`px-3 py-1 text-sm rounded-md transition-colors ${version === 'rvr1960' ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:bg-gray-300'}`}>RVR1960</button>
                    <button onClick={() => setVersion('ntv')} className={`px-3 py-1 text-sm rounded-md transition-colors ${version === 'ntv' ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:bg-gray-300'}`}>NTV</button>
                </div>
            </div>
            <div className="p-3 bg-white rounded">
                <p className="text-gray-800 italic leading-relaxed">{version === 'rvr1960' ? rvr1960 : ntv}</p>
            </div>
        </div>
    );
};

interface StepProps {
  sermonData: SermonData;
  handleInputChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const StepInitial: React.FC<StepProps> = ({ sermonData, handleInputChange }) => (
    <div>
        <h2 className="text-3xl font-bold text-center mb-6">Comencemos con el Pasaje</h2>
        <p className="text-center text-gray-600 mb-8">Ingresa el pasaje bíblico que será la base de tu sermón. Por ejemplo: "Marcos 1:16-20".</p>
        <Section title="Pasaje Bíblico">
            <input 
                type="text" 
                name="passage" 
                value={sermonData.passage}
                onChange={handleInputChange}
                placeholder="Ej: Juan 3:16" 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-white text-black"
            />
        </Section>
    </div>
);

interface StepWithAIProps extends StepProps {
  handleAISuggestion: (field: keyof SermonData, promptText: string) => void;
  isLoading: boolean;
}

const FormField: React.FC<{
    name: keyof SermonData;
    label: string;
    placeholder: string;
    rows: number;
} & StepWithAIProps> = ({ name, label, placeholder, rows, sermonData, handleInputChange, handleAISuggestion, isLoading }) => (
    <div className="mb-6">
        <label className="block text-lg font-semibold text-gray-700 mb-2">{label}</label>
        <textarea
            name={name}
            value={sermonData[name]}
            onChange={handleInputChange}
            rows={rows}
            placeholder={placeholder}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
        ></textarea>
        <AIButton 
            isLoading={isLoading} 
            onClick={() => handleAISuggestion(name, `Para el pasaje ${sermonData.passage || 'seleccionado'}, dame un análisis sobre "${label}".`)} 
        />
    </div>
);

const StepExegesis: React.FC<StepWithAIProps> = (props) => (
    <div>
        <h2 className="text-3xl font-bold text-center mb-6">Paso 1: Exégesis - ¿Qué dice el texto?</h2>
        <p className="text-center text-gray-600 mb-4">Analiza el texto cuidadosamente para entender su significado original. Concéntrate en los detalles.</p>
        <p className="text-center text-gray-500 italic mb-8">Para mayor profundidad en cada punto, no dudes en consultar la guía del seminario.</p>

        <Section title="Análisis Detallado del Texto">
            <FormField {...props} name="exe_verbs" label="Verbos y Acciones Clave" placeholder="Identifica los verbos principales y su significado. Ej: Ver (v.16), Llamar (v.17), Dejar (v.18)..." rows={4} />
            <FormField {...props} name="exe_characters" label="Personajes y Grupos" placeholder="¿Quiénes son los personajes principales y secundarios? ¿Qué representan? ¿Cuáles son sus motivaciones?" rows={4} />
            <FormField {...props} name="exe_location" label="Lugar y Ambiente" placeholder="¿Dónde ocurre la escena? ¿Qué importancia tiene el mar de Galilea, la casa de Simón, la sinagoga, etc.? Describe el ambiente." rows={4} />
            <FormField {...props} name="exe_editorial_context" label="Contexto Editorial (Antes y Después)" placeholder="¿Qué sucede justo antes y después de este pasaje? ¿Cómo conecta este pasaje con el tema general del libro de Marcos?" rows={4} />
            <FormField {...props} name="exe_structure" label="Estructura Narrativa y Palabras Clave" placeholder="¿Cómo está estructurada la historia (inicio, nudo, desenlace)? ¿Hay repeticiones, contrastes o palabras que se destacan?" rows={5} />
            <FormField {...props} name="exe_basic_questions" label="Preguntas Básicas (Qué, Quién, Dónde, Cuándo...)" placeholder="Anota observaciones iniciales respondiendo a: ¿Qué ocurre? ¿Quiénes están involucrados? ¿Dónde y cuándo sucede? ¿Cómo y por qué ocurre?" rows={5} />
        </Section>
        <Tip>Piensa como un director de teatro. ¿Cómo se ve la escena? ¿Qué ángulo revela mejor la acción? Esto te ayudará a separar el texto en escenas lógicas.</Tip>
    </div>
);


const StepHermeneutics: React.FC<StepWithAIProps> = ({ sermonData, handleInputChange, handleAISuggestion, isLoading }) => (
    <div>
        <h2 className="text-3xl font-bold text-center mb-6">Paso 2: Hermenéutica - El Puente al Hoy</h2>
        <p className="text-center text-gray-600 mb-4">Construye un puente entre el mundo bíblico y nuestra realidad contemporánea.</p>
        <p className="text-center text-gray-500 italic mb-8">Recuerda los principios de la "distancia histórica" y el "puente teológico" vistos en la guía.</p>

        <Section title="Distancia Histórica y Cultural">
            <label className="block text-lg font-semibold text-gray-700 mb-2">Similitudes y Diferencias</label>
            <textarea
                name="hist_dist"
                value={sermonData.hist_dist}
                onChange={handleInputChange}
                rows={6}
                placeholder="¿Qué tenemos en común con la audiencia original? (Ej: necesidades humanas, familia). ¿Qué es diferente? (Ej: idioma, gobierno, tecnología)."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
            ></textarea>
            <AIButton isLoading={isLoading} onClick={() => handleAISuggestion('hist_dist', `Compara la audiencia original de ${sermonData.passage} con una audiencia actual. Enumera similitudes y diferencias clave en cultura, sociedad y tecnología.`)} />
        </Section>

        <Section title="El Puente Teológico">
            <label className="block text-lg font-semibold text-gray-700 mb-2">Principio Teológico Central</label>
            <textarea
                name="theological_bridge"
                value={sermonData.theological_bridge}
                onChange={handleInputChange}
                rows={4}
                placeholder="¿Cuál es la verdad teológica atemporal que subyace en este texto? Debe ser válida tanto para ellos como para nosotros."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
            ></textarea>
            <AIButton isLoading={isLoading} onClick={() => handleAISuggestion('theological_bridge', `Basado en el análisis de ${sermonData.passage}, extrae el principio teológico central y eterno.`)} />
            <Tip>Este principio es la "idea central" que conecta el pasado con el presente. Es la respuesta a: ¿Qué quiso transmitir el autor a sus lectores originales que sigue siendo verdad hoy?</Tip>
        </Section>
    </div>
);

const StepHomiletics: React.FC<StepWithAIProps> = ({ sermonData, handleInputChange, handleAISuggestion, isLoading }) => (
  <div>
      <h2 className="text-3xl font-bold text-center mb-6">Paso 3: Homilética - La Exposición del Texto</h2>
      <p className="text-center text-gray-600 mb-8">Estructura el sermón para comunicar el mensaje de forma clara, coherente e impactante.</p>
      
      <Section title="Corazón del Sermón">
          <label className="block text-lg font-semibold text-gray-700 mb-2">¿Qué quiero que mi audiencia recuerde, sienta y haga?</label>
          <textarea name="sermon_heart" value={sermonData.sermon_heart} onChange={handleInputChange} rows={3} placeholder="Define una frase corta, clara e impactante que resuma el mensaje. Ej: 'Jesús sana en lo privado para enviarnos al encuentro con otros.'" className="w-full p-3 border border-gray-300 rounded-lg bg-white text-black"></textarea>
          <AIButton isLoading={isLoading} onClick={() => handleAISuggestion('sermon_heart', `Basado en el pasaje ${sermonData.passage} y el principio teológico "${sermonData.theological_bridge}", crea una frase corta, clara e impactante para el corazón del sermón.`)} />
      </Section>

      <Section title="El Motivador (Gancho)">
          <label className="block text-lg font-semibold text-gray-700 mb-2">¿Cómo conectar con la audiencia antes de abrir la Biblia?</label>
          <textarea name="motivator" value={sermonData.motivator} onChange={handleInputChange} rows={4} placeholder="Usa una historia personal, una pregunta, una estadística o una experiencia común para despertar interés." className="w-full p-3 border border-gray-300 rounded-lg bg-white text-black"></textarea>
          <Tip>El motivador prepara el terreno. Apela a una experiencia, emoción o necesidad común que luego el texto bíblico iluminará.</Tip>
      </Section>
      
      <Section title="Estructura del Sermón">
          <label className="block text-lg font-semibold text-gray-700 mb-2">Introducción</label>
          <textarea name="introduction" value={sermonData.introduction} onChange={handleInputChange} rows={4} placeholder="Prepara el terreno. Presenta el contexto del pasaje brevemente. Conecta el motivador con el texto." className="w-full p-3 border border-gray-300 rounded-lg mb-4 bg-white text-black"></textarea>

          <label className="block text-lg font-semibold text-gray-700 mb-2">Desarrollo</label>
          <textarea name="development" value={sermonData.development} onChange={handleInputChange} rows={10} placeholder="Explica el texto con claridad narrativa. Sigue la estructura del pasaje (situación inicial - acción - cambio). Destaca personajes, tensiones y giros." className="w-full p-3 border border-gray-300 rounded-lg mb-4 bg-white text-black"></textarea>
          <AIButton isLoading={isLoading} onClick={() => handleAISuggestion('development', `Basado en ${sermonData.passage} y las notas de exégesis, estructura un desarrollo narrativo para un sermón. Sigue la secuencia del pasaje.`)} />

          <label className="block text-lg font-semibold text-gray-700 mb-2">Aplicación</label>
          <textarea name="application" value={sermonData.application} onChange={handleInputChange} rows={5} placeholder="Aplica el principio teológico a la vida actual. Sé directo, claro y contextualizado. Incluye dimensiones personal, comunitaria y social." className="w-full p-3 border border-gray-300 rounded-lg mb-4 bg-white text-black"></textarea>
          <Tip>Haz preguntas desafiantes. Ej: ¿A quién estoy ignorando que Jesús me llama a tocar? ¿Qué "redes" debo dejar para seguir a Cristo hoy?</Tip>

          <label className="block text-lg font-semibold text-gray-700 mb-2">Síntesis / Conclusión</label>
          <textarea name="synthesis" value={sermonData.synthesis} onChange={handleInputChange} rows={4} placeholder="Resume los puntos clave y haz un llamado final a la acción o reflexión. Vuelve a mencionar el corazón del sermón." className="w-full p-3 border border-gray-300 rounded-lg bg-white text-black"></textarea>
      </Section>
  </div>
);

interface StepReviewProps {
    sermonData: SermonData;
    passageText: { rvr1960: string; ntv: string };
    handleInputChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const EditableField: React.FC<{ name: keyof SermonData, label: string, rows: number } & StepReviewProps> = ({ name, label, rows, sermonData, handleInputChange }) => (
    <>
        <label className="block text-lg font-semibold text-gray-700 mt-4 mb-2">{label}</label>
        <textarea name={name} value={sermonData[name]} onChange={handleInputChange} rows={rows} className="w-full p-3 border border-gray-300 rounded-lg bg-white text-black" />
    </>
);

const StepReview: React.FC<StepReviewProps> = (props) => (
    <div>
        <h2 className="text-3xl font-bold text-center mb-6">Paso 5: Revisión y Edición Final</h2>
        <p className="text-center text-gray-600 mb-8">Realiza los ajustes finales a tu sermón aquí. Todos los campos son editables. Cuando termines, haz clic en "Confirmar y Finalizar".</p>
        
        <Section title="Pasaje Bíblico">
            <p className="text-gray-600 mt-2 whitespace-pre-wrap p-4 bg-gray-50 rounded-lg">{`${props.sermonData.passage}\n\nRVR1960:\n${props.passageText.rvr1960}\n\nNTV:\n${props.passageText.ntv}`}</p>
        </Section>

        <Section title="Exégesis">
            <EditableField {...props} name="exe_verbs" label="Verbos y Acciones Clave" rows={4} />
            <EditableField {...props} name="exe_characters" label="Personajes y Grupos" rows={4} />
            <EditableField {...props} name="exe_location" label="Lugar y Ambiente" rows={4} />
            <EditableField {...props} name="exe_editorial_context" label="Contexto Editorial (Antes y Después)" rows={4} />
            <EditableField {...props} name="exe_structure" label="Estructura Narrativa y Palabras Clave" rows={5} />
            <EditableField {...props} name="exe_basic_questions" label="Preguntas Básicas (Qué, Quién, Dónde, Cuándo...)" rows={5} />
        </Section>
        
        <Section title="Hermenéutica">
             <EditableField {...props} name="hist_dist" label="Distancia Histórica (Similitudes y Diferencias)" rows={6} />
             <EditableField {...props} name="theological_bridge" label="Principio Teológico Central (El Puente)" rows={4} />
        </Section>

        <Section title="Homilética">
            <EditableField {...props} name="sermon_heart" label="Corazón del Sermón" rows={3} />
            <EditableField {...props} name="motivator" label="Motivador (Gancho)" rows={4} />
            <EditableField {...props} name="introduction" label="Introducción" rows={4} />
            <EditableField {...props} name="development" label="Desarrollo" rows={10} />
            <EditableField {...props} name="application" label="Aplicación" rows={5} />
            <EditableField {...props} name="synthesis" label="Síntesis / Conclusión" rows={4} />
        </Section>
    </div>
);

interface StepFinalProps {
    goToStep: (step: number) => void;
    resetSermon: () => void;
    downloadPdf: () => void;
}

const StepFinal: React.FC<StepFinalProps> = ({ goToStep, resetSermon, downloadPdf }) => (
    <div className="text-center py-8">
        <div className="mx-auto bg-green-100 rounded-full h-24 w-24 flex items-center justify-center">
            <svg className="h-16 w-16 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
        </div>
        <h2 className="text-3xl font-bold mt-6 mb-4">¡Felicidades, has completado la guía!</h2>
        <p className="text-lg text-gray-600 mb-6">
            Tu sermón está listo para ser descargado.
        </p>

        <div className="mt-10 text-center">
             <button 
                onClick={downloadPdf}
                className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 transition-colors animate-pulse text-lg"
              >
                Descargar Sermón (PDF)
              </button>
        </div>

        <div className="bg-blue-100 border-l-4 border-blue-400 text-blue-800 p-4 rounded-r-lg my-8 text-left">
            <h4 className="font-bold mb-2">Pasos finales recomendados:</h4>
            <ul className="list-disc list-inside">
                <li className="mb-2"><strong>Revisa y refina:</strong> Vuelve a leer tu análisis y notas. A menudo, una segunda mirada revela nuevas conexiones y formas de mejorar la claridad de tu mensaje.</li>
                <li><strong>Busca la guía del Espíritu:</strong> Sobre todo, no olvides que la preparación es solo una parte. La predicación efectiva nace de una profunda dependencia del Espíritu Santo para comunicar la Palabra de Dios de forma clara, fiel y transformadora.</li>
            </ul>
        </div>
        <div className="mt-8 flex justify-center space-x-4">
            <button onClick={() => goToStep(5)} className="px-6 py-2 bg-gray-600 text-white rounded-lg shadow hover:bg-gray-700 transition-colors">Volver a Editar</button>
            <button onClick={resetSermon} className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors">Empezar un Nuevo Sermón</button>
        </div>
    </div>
);

interface PrintableSermonProps {
    sermonData: SermonData;
    passageText: { rvr1960: string; ntv: string };
}

const PrintableSermon: React.FC<PrintableSermonProps> = ({ sermonData, passageText }) => {
    const PrintSection: React.FC<{ title: string; content?: string }> = ({ title, content }) => (
        content ? (
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16pt', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '8px', color: '#333' }}>{title}</h3>
                <p style={{ fontSize: '12pt', whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#555' }}>{content}</p>
            </div>
        ) : null
    );

    return (
        <div style={{ padding: '40px', backgroundColor: 'white', color: 'black', fontFamily: 'serif', width: '210mm' }}>
            <h1 style={{ fontSize: '24pt', fontWeight: 'bold', textAlign: 'center', marginBottom: '16px' }}>Sermón sobre: {sermonData.passage}</h1>
            
            <div style={{ border: '1px solid #eee', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '8px' }}>Pasaje Bíblico (RVR1960)</h2>
                <p style={{ fontSize: '11pt', fontStyle: 'italic', lineHeight: '1.5' }}>{passageText.rvr1960}</p>
                <h2 style={{ fontSize: '14pt', fontWeight: 'bold', marginTop: '16px', marginBottom: '8px' }}>Pasaje Bíblico (NTV)</h2>
                <p style={{ fontSize: '11pt', fontStyle: 'italic', lineHeight: '1.5' }}>{passageText.ntv}</p>
            </div>

            <h2 style={{ fontSize: '20pt', fontWeight: 'bold', color: '#005a9c', marginTop: '32px', marginBottom: '16px' }}>I. Exégesis: Análisis del Texto</h2>
            <PrintSection title="Verbos y Acciones Clave" content={sermonData.exe_verbs} />
            <PrintSection title="Personajes y Grupos" content={sermonData.exe_characters} />
            <PrintSection title="Lugar y Ambiente" content={sermonData.exe_location} />
            <PrintSection title="Contexto Editorial (Antes y Después)" content={sermonData.exe_editorial_context} />
            <PrintSection title="Estructura Narrativa y Palabras Clave" content={sermonData.exe_structure} />
            <PrintSection title="Preguntas Básicas (Qué, Quién, Dónde, Cuándo...)" content={sermonData.exe_basic_questions} />

            <h2 style={{ fontSize: '20pt', fontWeight: 'bold', color: '#005a9c', marginTop: '32px', marginBottom: '16px' }}>II. Hermenéutica: El Puente al Hoy</h2>
            <PrintSection title="Distancia Histórica (Similitudes y Diferencias)" content={sermonData.hist_dist} />
            <PrintSection title="Principio Teológico Central (El Puente)" content={sermonData.theological_bridge} />
            
            <h2 style={{ fontSize: '20pt', fontWeight: 'bold', color: '#005a9c', marginTop: '32px', marginBottom: '16px' }}>III. Homilética: Estructura del Sermón</h2>
            <PrintSection title="Corazón del Sermón (Mensaje Central)" content={sermonData.sermon_heart} />
            <PrintSection title="Motivador (Gancho)" content={sermonData.motivator} />
            <PrintSection title="Introducción" content={sermonData.introduction} />
            <PrintSection title="Desarrollo" content={sermonData.development} />
            <PrintSection title="Aplicación" content={sermonData.application} />
            <PrintSection title="Síntesis / Conclusión" content={sermonData.synthesis} />
        </div>
    );
};


const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);