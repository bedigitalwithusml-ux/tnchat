# Our Private Space ❤️

A private, secure, fast, and beautiful 2-person messaging web application designed exclusively for **two people**.

---

## Features

- **Exclusive 2-User Access**: Strictly restricted to two authenticated accounts. No public registration or sign-ups.
- **Persistent Messages**: Full message history with SQLite local storage and Netlify Blobs production cloud support.
- **Real-Time Updates**: Smart light polling for instant message updates and online presence indicators.
- **Rich Message System**: Text, emojis, reactions (`❤️`, `😂`, `🥹`, `👍`, `😮`, `😢`), quoted replies, message editing, soft deletion, and message pinning.
- **File & Image Sharing**: Upload JPG, PNG, WEBP, GIF, PDF, and documents with fullscreen lightbox photo viewer.
- **Search & Pinned Messages**: Instant keyword search drawer and dedicated pinned messages list.
- **Our Memories ❤️**: A private digital gallery to save photos and special moments together.
- **Customizable Appearance**: Light warm theme, dark amethyst theme, subtle heart patterns, and soft gradient backgrounds.
- **Security & Privacy**: Server-side authentication, bcrypt password hashing, HttpOnly secure cookies, input sanitization, and protected attachments.

---

## Local Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your `.env` file variables:
- `SESSION_SECRET`: A secret key used for session security.
- `USER_1_USERNAME` / `USER_1_PASSWORD`: Credentials for the first user.
- `USER_2_USERNAME` / `USER_2_PASSWORD`: Credentials for the second user.
- `STORAGE_PROVIDER`: Set to `local` for local development.

### 3. Initialize Database & Users
Run the setup script to seed the database schema and initialize the two authorized user accounts:
```bash
npm run setup
```

### 4. Run Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000` to access the application.

---

## Backup & Restore

### Create a Local Data Backup
Export current users, messages, reactions, pinned items, and memories to a JSON file in `backups/`:
```bash
npm run backup
```

### Restore Data from Backup
```bash
npm run restore backups/backup-17123456789.json
```

---

## Netlify Production Deployment

1. **Push Repository to GitHub**
   Create a private repository on GitHub and push the codebase.

2. **Create Netlify Site**
   - Log into [Netlify](https://app.netlify.com).
   - Click **Add new site** -> **Import an existing project**.
   - Connect your GitHub repository.

3. **Configure Environment Variables**
   In Netlify Site Settings -> **Environment variables**, set:
   - `NODE_ENV` = `production`
   - `SESSION_SECRET` = `<your-random-secret-key>`
   - `STORAGE_PROVIDER` = `netlify`
   - `NETLIFY_BLOBS_STORE` = `our_private_chat_blobs`

4. **Deploy**
   - Click **Deploy site**.
   - Netlify will build static files from `public/` and deploy functions from `netlify/functions/`.

5. **Verify Deployment**
   - Access the deployed Netlify URL.
   - Test login with both user credentials.
   - Verify real-time messaging, attachments, reactions, search, and themes.
