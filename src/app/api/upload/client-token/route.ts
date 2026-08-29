import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

/**
 * Issues short-lived tokens so the browser can upload straight to Vercel Blob.
 *
 * The file never passes through this server, which is the point: a serverless
 * function caps the request body it will accept (~4.5MB on Vercel), and a file
 * over that cap is rejected with a plain-text 413 before our route handler ever
 * runs — which is what produced the "Unexpected token 'R', "Request En"…"
 * error, i.e. `JSON.parse` choking on "Request Entity Too Large".
 *
 * The size and type limits below are enforced by the Blob service itself when
 * it validates the token, so they still apply to a direct browser upload.
 */

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [...IMAGE_TYPES, ...DOC_TYPES],
        maximumSizeInBytes: 10 * 1024 * 1024,
        addRandomSuffix: true,
      }),
      // Required by the API, but nothing to do here: the admin form takes the
      // returned URL straight from the client upload result.
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not authorize upload' },
      { status: 400 }
    );
  }
}
