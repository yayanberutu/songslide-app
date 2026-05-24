# SongSlide Frontend

Next.js, React, TypeScript, and Tailwind CSS operator shell for SongSlide.

This phase only provides the application shell and placeholder routes. Song book management, song management, editor, preview, export, upload, and OCR workflows are implemented in later issues.

## Local Development

```bash
npm install
npm run lint
npm run typecheck
npm run build
npm run dev
```

Default local URL:

```text
http://localhost:3000
```

## Environment

The frontend reads the backend base URL from:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

When the frontend runs inside Docker Compose, the Next.js rewrite proxy uses:

```text
BACKEND_INTERNAL_URL=http://backend:8080
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

`BACKEND_INTERNAL_URL` is server-only and points to the backend container on the Docker network. Docker Compose passes it during the frontend image build and at runtime because Next.js rewrites are compiled into the production build. Browser-side API calls still go through `/backend-api/*`; they should not call `http://backend:8080` directly.

The app shell renders without backend data.
