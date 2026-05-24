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

The app shell renders without backend data.
