import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Sanitize filename: lowercase, replace spaces with hyphens, strip unsafe chars
    const rawName = file.name.replace(/\.[^.]+$/, ''); // strip extension
    const ext = file.name.split('.').pop()?.toLowerCase() || 'wav';
    const safeName = rawName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    const filename = `${safeName}.${ext}`;

    // Check if we have Vercel Blob token (production mode)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import('@vercel/blob');
      const blob = await put(`audio/${filename}`, file, {
        access: 'public',
        addRandomSuffix: false,
      });
      return NextResponse.json({ url: blob.url, filename });
    }

    // Development mode: write to public/audio/
    const { writeFile, mkdir } = await import('fs/promises');
    const path = await import('path');

    const audioDir = path.join(process.cwd(), 'public', 'audio');
    await mkdir(audioDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(audioDir, filename);
    await writeFile(filePath, buffer);

    return NextResponse.json({ url: `/audio/${filename}`, filename });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
