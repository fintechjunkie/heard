import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

// Client upload handler for Vercel Blob (production)
// The browser uploads directly to Blob storage — no file passes through this function
export async function POST(request: NextRequest) {
  // If no Blob token, use the dev fallback route
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return handleDevUpload(request);
  }

  // Production: handle Vercel Blob client upload handshake
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Validate the upload
        return {
          allowedContentTypes: ['audio/wav', 'audio/wave', 'audio/x-wav', 'audio/mpeg', 'audio/mp3'],
          maximumSizeInBytes: 100 * 1024 * 1024, // 100MB max
          tokenPayload: JSON.stringify({ pathname }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Upload completed:', blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}

// Development mode: receive file via FormData and write to public/audio/
async function handleDevUpload(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Sanitize filename
    const rawName = file.name.replace(/\.[^.]+$/, '');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'wav';
    const safeName = rawName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    const filename = `${safeName}.${ext}`;

    const { writeFile, mkdir } = await import('fs/promises');
    const path = await import('path');

    const audioDir = path.join(process.cwd(), 'public', 'audio');
    await mkdir(audioDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(audioDir, filename), buffer);

    return NextResponse.json({ url: `/audio/${filename}`, filename });
  } catch (error) {
    console.error('Dev upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
