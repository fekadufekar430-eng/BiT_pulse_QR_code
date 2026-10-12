# Bahir Dar University Feedback Desk — Frontend

Responsive frontend based on the supplied dark navy / cyan / gold design. The page intentionally has **no navigation or header** and does not include a QR-code generator.

## Files

- `index.html` — page structure and feedback form
- `style.css` — responsive visual design and interaction states
- `script.js` — category selection, optional five-star rating, character counter, validation, and API submission
- `assets/official-feedback-qr.png` — add your own separately generated QR image here

## Connect it to your backend

The JavaScript currently posts to:

```js
const API_URL = "/api/feedback";
```

This works when the frontend is served from the same origin as your Express app and that backend exposes `POST /api/feedback`. If the API is hosted on a different origin, change `API_URL` to the full backend endpoint and configure CORS on the backend.

Expected JSON request:

```json
{
  "name": "Student Name",
  "email": "student@example.edu",
  "category": "General",
  "rating": 5,
  "message": "My feedback..."
}
```

`email` and `rating` are optional. The backend should validate every field independently and send the message through Resend using server-side environment variables. Never place the Resend API key in frontend JavaScript.

## Run locally

Serve these files from your Express app's static directory, or use a local static server. Opening `index.html` directly from the filesystem may not work with a relative `/api/feedback` endpoint.

## QR image

Generate the QR separately using your deployed feedback URL, then save the image as `assets/official-feedback-qr.png`. No QR generator is bundled in this frontend.
