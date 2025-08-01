'use client';

import { useState, useRef } from 'react';
import axios from 'axios';
import JSZip from 'jszip';

export default function TranscriptionApp() {
  const [urls, setUrls] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [transcriptions, setTranscriptions] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const urlList = urls.split('\n').filter(url => url.trim());
    
    if (urlList.length === 0) {
      setError('Por favor ingresa al menos una URL de Vimeo');
      return;
    }

    // Validar que sean URLs de Vimeo
    const vimeoUrls = urlList.filter(url => url.includes('vimeo.com'));
    if (vimeoUrls.length === 0) {
      setError('Por favor ingresa URLs válidas de Vimeo');
      return;
    }

    setShowInstructions(true);
    setError('');
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!files || files.length === 0) {
      setError('Por favor selecciona al menos un archivo de audio');
      return;
    }

    setLoading(true);
    setError('');
    setTranscriptions([]);
    setProgress('Transcribiendo archivos...');

    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('audio', file);
    });

    try {
      const response = await axios.post('/api/transcribe-audio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(`Procesando: ${percentCompleted}%`);
          }
        }
      });

      setTranscriptions(response.data.transcriptions);
      setProgress('¡Transcripciones completadas!');
      
      // Generar y descargar ZIP
      if (response.data.transcriptions.length > 0) {
        await downloadZip(response.data.transcriptions);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error al procesar los archivos');
      setProgress('');
    } finally {
      setLoading(false);
    }
  };

  const downloadZip = async (transcriptions: any[]) => {
    const zip = new JSZip();
    
    transcriptions.forEach((item, index) => {
      const filename = `transcripcion_${index + 1}_${item.filename.replace(/[^a-z0-9]/gi, '_')}.txt`;
      zip.file(filename, item.transcription);
    });
    
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcripciones_vimeo_${new Date().getTime()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-800 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-2xl p-6 sm:p-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2 text-gray-800">
            Transcriptor de Videos de Vimeo
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Transcribe el audio de tus videos de Vimeo usando IA
          </p>

          {!showInstructions ? (
            // Paso 1: Ingresar URLs
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URLs de videos de Vimeo
                </label>
                <textarea
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  placeholder="Ingresa las URLs de Vimeo (una por línea)&#10;Ejemplo:&#10;https://vimeo.com/123456789&#10;https://vimeo.com/987654321"
                  rows={6}
                  className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none font-mono text-sm resize-vertical"
                />
              </div>
              
              <button 
                type="submit"
                className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 transform transition hover:scale-[1.02] hover:shadow-lg"
              >
                Continuar
              </button>
            </form>
          ) : (
            // Paso 2: Instrucciones y carga de archivos
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  📋 Instrucciones para descargar el audio:
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-blue-800 text-sm">
                  <li>Visita cada URL de Vimeo que ingresaste</li>
                  <li>Usa una extensión del navegador o herramienta online para descargar el audio</li>
                  <li>Guarda los archivos de audio en formato MP3, MP4, M4A o WAV</li>
                  <li>Sube los archivos aquí para transcribirlos</li>
                </ol>
                
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Nota:</strong> Debido a las restricciones de Vimeo, no podemos descargar automáticamente los videos. 
                    Necesitas descargar el audio manualmente.
                  </p>
                </div>
              </div>

              <form onSubmit={handleFileUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subir archivos de audio
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="audio/*,.mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm"
                    onChange={(e) => setFiles(e.target.files)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Formatos soportados: MP3, MP4, M4A, WAV, WEBM (máx. 25MB por archivo)
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    type="submit" 
                    disabled={loading || !files}
                    className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-70 disabled:cursor-not-allowed transform transition hover:scale-[1.02] hover:shadow-lg"
                  >
                    {loading ? 'Transcribiendo...' : 'Transcribir Audio'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setShowInstructions(false);
                      setFiles(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transform transition"
                  >
                    Volver
                  </button>
                </div>
              </form>
            </div>
          )}

          {progress && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
              <span className="text-2xl animate-spin">⏳</span>
              <p className="text-blue-800">{progress}</p>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {transcriptions.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">
                Transcripciones Generadas
              </h2>
              <div className="space-y-4">
                {transcriptions.map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold mb-3 text-gray-700">
                      {item.filename}
                    </h3>
                    <div className="bg-white p-4 rounded border border-gray-300 max-h-64 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm text-gray-600 font-sans">
                        {item.transcription}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setTranscriptions([]);
                    setShowInstructions(false);
                    setUrls('');
                    setFiles(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"
                >
                  Transcribir más videos
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sección de ayuda */}
        <div className="mt-8 bg-white/10 backdrop-blur rounded-lg p-6 text-white">
          <h3 className="font-semibold mb-3">💡 Herramientas recomendadas para descargar audio:</h3>
          <ul className="space-y-2 text-sm">
            <li>• <strong>Extensiones de navegador:</strong> Video DownloadHelper, Vimeo Video Downloader</li>
            <li>• <strong>Servicios online:</strong> SaveFrom.net, Y2mate (busca "Vimeo downloader")</li>
            <li>• <strong>Software de escritorio:</strong> 4K Video Downloader, JDownloader</li>
          </ul>
          <p className="mt-3 text-xs opacity-80">
            Nota: Asegúrate de tener permiso para descargar y transcribir el contenido.
          </p>
        </div>
      </div>
    </div>
  );
}