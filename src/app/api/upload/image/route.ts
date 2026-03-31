import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate image type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, and GIF images are allowed' }, { status: 400 });
    }

    // Max 5MB for images
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blob = await put(`images/${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
