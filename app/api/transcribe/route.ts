import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('audio') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron archivos de audio' },
        { status: 400 }
      );
    }

    // Validar tamaño de archivos (25MB máximo por archivo)
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `El archivo ${file.name} excede el límite de 25MB` },
          { status: 400 }
        );
      }
    }

    const transcriptions = [];

    for (const file of files) {
      try {
        console.log(`Transcribiendo: ${file.name}`);
        
        // Crear un File/Blob para OpenAI
        const transcription = await openai.audio.transcriptions.create({
          file: file,
          model: "whisper-1",
          language: "es", // Cambiar según necesites
          response_format: "text",
        });

        transcriptions.push({
          filename: file.name,
          transcription: transcription
        });
        
      } catch (error: any) {
        console.error(`Error transcribiendo ${file.name}:`, error);
        // Continuar con los demás archivos si uno falla
        transcriptions.push({
          filename: file.name,
          transcription: `Error al transcribir este archivo: ${error.message}`
        });
      }
    }

    return NextResponse.json({ transcriptions });
    
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { 
        error: 'Error al procesar las transcripciones',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};