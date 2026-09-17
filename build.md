# Build a Private 2-Person Chat Web App

Build a complete, production-quality private chat web application designed exclusively for **two people** — me and my soulmate.

This is NOT a public social network, NOT a multi-user messaging platform, and NOT an admin dashboard product.

The entire application should be intentionally simple, private, fast, beautiful, and optimized for exactly two authenticated users.

The project must work **locally first**, using a clean local development setup, and should later be deployable to **Netlify** using Netlify Functions and persistent storage such as Netlify Blobs.

---

# 1. CORE REQUIREMENT

Create a private web application where exactly two authorized people can communicate with each other.

There should be:

* User authentication
* Exactly 2 authorized accounts
* One private conversation between those two accounts
* Persistent messages
* Real-time/near-real-time message updates
* Message timestamps
* Read/delivery states
* Typing indicator
* Online/last-seen status
* Image/file sharing
* Emoji support
* Message reactions
* Message editing
* Message deletion
* Reply-to-message
* Message search
* Pinned messages
* Personal profile settings
* Custom chat appearance
* Responsive mobile + desktop UI

Do not build unnecessary features for groups, public profiles, followers, channels, communities, etc.

The application should feel like a private digital space belonging only to these two people.

---

# 2. IMPORTANT ARCHITECTURE REQUIREMENT

Build the application so the frontend and backend are clearly separated.

Recommended structure:

```text
private-chat/
│
├── public/
│   ├── index.html
│   ├── assets/
│   ├── css/
│   └── js/
│
├── netlify/
│   └── functions/
│       ├── auth
│       ├── messages
│       ├── send-message
│       ├── edit-message
│       ├── delete-message
│       ├── mark-read
│       ├── presence
│       ├── upload
│       └── settings
│
├── data/
│   └── local development data
│
├── package.json
├── netlify.toml
├── README.md
└── .env.example
```

You may modify this structure if there is a technically better architecture, but keep the project organized and easy to understand.

---

# 3. LOCAL DEVELOPMENT FIRST

The application must run completely locally before deployment.

Provide:

```bash
npm install
npm run dev
```

or an equivalent simple command.

Create a local development storage implementation so the app can be tested without requiring Netlify.

For local development, persistent data may be stored using:

* JSON files
* SQLite

Prefer **SQLite** if practical because it is more reliable for concurrent writes than manually modifying JSON files.

However, keep the storage layer abstracted so production storage can later use Netlify-compatible persistent storage.

DO NOT hard-code the application directly to SQLite in every API route.

Instead create a storage/service layer:

```text
services/
    storage.js
    auth.js
    messages.js
```

This allows the storage implementation to be swapped later.

---

# 4. PRODUCTION STORAGE

The production architecture should be compatible with Netlify.

Do NOT assume that files written into the deployed Netlify site's filesystem will persist permanently.

The deployed application should use a persistent external storage mechanism supported by Netlify, preferably Netlify Blobs for this lightweight two-person application.

Create the application so that:

```text
LOCAL
SQLite/local storage
        ↓
Storage abstraction
        ↓
PRODUCTION
Netlify Blobs
```

The frontend must never directly access the storage layer.

All reads/writes must happen through authenticated backend functions.

---

# 5. EXACTLY TWO USERS

The application is intentionally restricted to two users.

Create a users structure similar to:

```text
user_1
user_2
```

Do not create public registration.

There should be no:

* Sign up page
* Public registration
* User discovery
* Friend requests
* Following
* Public profiles

Only the two predefined accounts can access the application.

Use environment variables or secure initialization for the initial account credentials.

NEVER put passwords, authentication secrets, API keys, or private storage credentials in frontend JavaScript.

---

# 6. AUTHENTICATION

Create a secure login screen.

Design:

```text
              ❤️

          Our Private Space

       Your name / account
       [_______________]

       Password
       [_______________]

            [ Enter ]

       Private • Just Us
```

Authentication must happen server-side.

Passwords must never be stored as plaintext.

Use a modern password hashing algorithm such as Argon2id or bcrypt.

Use secure session handling.

Prefer secure HTTP-only cookies rather than storing authentication tokens in localStorage.

Cookie configuration should include:

```text
HttpOnly
Secure in production
SameSite=Lax or Strict
```

Sessions should expire appropriately.

Provide logout functionality.

---

# 7. AUTHORIZATION

Every protected backend endpoint must verify authentication.

Do not rely on frontend route protection alone.

For example, this must NOT be sufficient:

```javascript
if (!loggedIn) {
    window.location.href = "/login";
}
```

The backend must independently reject unauthorized requests.

If someone directly accesses:

```text
/api/messages
/api/users
/api/settings
/api/upload
```

without a valid authenticated session, return:

```text
401 Unauthorized
```

If a logged-in user attempts to access data belonging to a different user, return:

```text
403 Forbidden
```

There should be no publicly accessible message API.

---

# 8. LOGIN SECURITY

Implement:

* Password hashing
* Session expiration
* Login rate limiting
* Basic brute-force protection
* Generic invalid-login error
* Secure cookies
* Logout
* Session invalidation

Do not reveal whether a username exists.

Avoid messages such as:

```text
User exists but password is wrong.
```

Instead use:

```text
Invalid credentials.
```

---

# 9. MAIN CHAT SCREEN

After successful login, open the main private conversation.

Desktop layout:

```text
┌────────────────────────────────────────────────────┐
│ ❤️ Our Space                           ⚙ Profile   │
├────────────────────────────────────────────────────┤
│                                                    │
│                     Chat Header                    │
│                                                    │
│              ❤️ Soulmate Name                      │
│              online / last seen                    │
│                                                    │
├────────────────────────────────────────────────────┤
│                                                    │
│                     TODAY                          │
│                                                    │
│                              Hey ❤️               │
│                              7:42 PM               │
│                                                    │
│     How was your day?                              │
│     7:43 PM                                        │
│                                                    │
│                              Pretty good 😊        │
│                              7:44 PM               │
│                                                    │
│                              Missed you though ❤️  │
│                              7:44 PM               │
│                                                    │
├────────────────────────────────────────────────────┤
│ 📎   😊   Type a message...              ❤️  ➤    │
└────────────────────────────────────────────────────┘
```

On mobile, make it feel like a polished native messaging application.

---

# 10. VISUAL DESIGN

The UI should feel:

* Premium
* Warm
* Personal
* Minimal
* Modern
* Smooth
* Elegant
* Private

Avoid making it look like a generic corporate dashboard.

Avoid excessive cards.

Avoid unnecessary gradients.

Avoid huge decorative elements.

Use excellent typography, spacing, shadows, borders, and subtle animations.

The interface should prioritize the conversation itself.

Use a tasteful romantic aesthetic without becoming overly cheesy.

Do NOT use excessive hearts everywhere.

Use hearts as subtle accents.

---

# 11. CHAT HEADER

Header should contain:

* Profile image/avatar
* Person's display name
* Online indicator
* Online / Last seen text
* Search button
* Optional pinned messages button
* Settings/menu button

Example:

```text
┌────────────────────────────────────────────┐
│  ○   Soulmate Name                         │
│      ● Online                              │
│                                      🔍 ⋮  │
└────────────────────────────────────────────┘
```

---

# 12. MESSAGE SYSTEM

Each message should support:

* Unique ID
* Sender ID
* Conversation ID
* Message content
* Timestamp
* Edited state
* Deleted state
* Reply-to ID
* Attachment IDs
* Reaction data
* Read status

Example conceptual structure:

```json
{
  "id": "msg_123",
  "conversationId": "private_001",
  "senderId": "user_1",
  "content": "I miss you ❤️",
  "createdAt": "2026-09-17T15:30:00Z",
  "editedAt": null,
  "deletedAt": null,
  "replyTo": null,
  "attachments": [],
  "reactions": {}
}
```

---

# 13. MESSAGE BUBBLES

Differentiate the two users clearly.

Own messages:

```text
                     ┌───────────────────┐
                     │ I miss you ❤️     │
                     │           7:43 PM ✓│
                     └───────────────────┘
```

Other person's messages:

```text
┌───────────────────┐
│ Miss you too 🥹   │
│ 7:44 PM           │
└───────────────────┘
```

Do not use excessive bubble decorations.

Keep them clean and readable.

---

# 14. MESSAGE STATES

Support:

```text
Sending
✓ Sent
✓✓ Delivered
✓✓ Read
```

Use subtle visual differences.

Do not make read receipts visually distracting.

---

# 15. TYPING INDICATOR

When the other person is typing, show:

```text
Soulmate Name is typing...
```

with a subtle animated three-dot indicator.

Do not permanently save typing events as messages.

Typing state should expire automatically.

---

# 16. ONLINE / LAST SEEN

Implement lightweight presence.

Display:

```text
● Online
```

or:

```text
Last seen 12 minutes ago
```

Presence should automatically update.

Do not continuously spam the backend.

Use a heartbeat interval with sensible throttling.

---

# 17. REAL-TIME MESSAGES

The experience should feel real-time.

Preferred implementation:

```text
WebSocket / Server-Sent Events
```

If Netlify's serverless architecture makes persistent WebSocket connections impractical, implement a lightweight polling or event-based strategy suitable for only two users.

For example:

```text
GET /api/messages?after=<lastMessageId>
```

every few seconds while the chat is open.

Do not continuously reload the entire conversation.

The UI should only fetch messages newer than the latest known message.

---

# 18. MESSAGE COMPOSER

Bottom composer should contain:

```text
📎   😊   [ Type a message... ]   ➤
```

Features:

* Enter = send
* Shift + Enter = newline
* Emoji picker
* Attachment button
* Auto-growing textarea
* Disable send when empty
* Sending indicator
* Prevent duplicate submissions

On mobile, ensure keyboard behavior is handled correctly.

---

# 19. EMOJI

Add a proper emoji picker.

Users should be able to send emojis naturally.

Do not create a huge emoji interface that takes over the screen.

---

# 20. MESSAGE REACTIONS

Allow users to react to messages.

Initial reactions:

```text
❤️
😂
🥹
👍
😮
😢
```

Clicking a reaction should toggle it.

Display:

```text
             ❤️ 2
```

or:

```text
❤️
```

depending on how many reactions exist.

---

# 21. REPLY TO MESSAGE

Long press / right click / message menu should provide:

```text
Reply
React
Copy
Edit
Delete
```

For a reply, show a small quoted preview above the message.

Example:

```text
┌───────────────────────────┐
│ "Miss you ❤️"             │
├───────────────────────────┤
│ Me too 🥹                 │
└───────────────────────────┘
```

---

# 22. EDIT MESSAGE

The sender can edit their own messages.

Show:

```text
Edited
```

after editing.

Do not allow one user to edit another person's message.

---

# 23. DELETE MESSAGE

Allow the sender to delete their own message.

Use soft deletion where possible.

Instead of permanently removing the database record immediately, mark:

```text
deletedAt
```

and display:

```text
This message was deleted
```

Do not allow unauthorized deletion.

---

# 24. FILE AND IMAGE SHARING

Allow:

* JPG
* PNG
* WEBP
* GIF
* PDF
* common documents

Set sensible upload size limits.

Do not trust file extensions.

Validate MIME types server-side.

Do not allow arbitrary executable uploads.

Images should show previews.

Other files should show:

```text
📄 filename.pdf
Download
```

Store attachments separately from message metadata.

Do not expose raw storage credentials to the frontend.

---

# 25. IMAGE VIEWER

Clicking an image should open a clean full-screen/lightbox viewer.

Support:

* Zoom
* Close
* Previous/next where applicable
* Download

Keep it simple.

---

# 26. MESSAGE SEARCH

Add search functionality.

Search should support:

```text
message text
```

Display results with:

```text
Date
Message preview
Sender
```

Clicking a result should navigate to that message in the conversation.

Do not perform an expensive full database scan on every keystroke.

Debounce search input.

---

# 27. PINNED MESSAGES

Allow either person to pin important messages.

Examples:

* Important plans
* Special messages
* Addresses
* Notes
* Memories

Pinned section:

```text
📌 Pinned

"I love you more than yesterday."
```

Clicking a pinned message should jump to it.

---

# 28. PROFILE

Each user should have:

* Display name
* Profile image/avatar
* Short status
* Last seen setting
* Read receipts setting
* Notification preference

Do not expose profiles publicly.

---

# 29. SETTINGS

Create a simple settings panel.

Sections:

### Account

* Display name
* Profile photo
* Password change
* Logout

### Chat

* Enter to send
* Read receipts
* Typing indicator
* Notification preferences

### Appearance

* Light
* Dark
* System
* Chat background

### Privacy

* Last seen
* Online visibility
* Read receipts

---

# 30. PRIVATE MEMORIES SECTION

Add an optional separate section called:

```text
Our Memories ❤️
```

This is not a public gallery.

It can contain saved photos/messages.

Keep this modular so it can be expanded later.

---

# 31. NOTIFICATIONS

When a new message arrives and the user is not actively viewing the chat:

Show an appropriate browser notification if permission has been granted.

Example:

```text
❤️ Soulmate Name
I miss you
```

Do not request notification permission immediately on page load.

Ask at an appropriate moment.

---

# 32. DATA MODEL

Create a clean data model.

Suggested entities:

```text
users
sessions
conversation
messages
attachments
reactions
pinned_messages
presence
settings
```

Since there are exactly two users, there should only ever be one primary private conversation.

---

# 33. STORAGE ABSTRACTION

Create functions similar to:

```javascript
getUser(id)
getUsers()
createSession()
getSession()
deleteSession()

getMessages(conversationId, options)
createMessage(message)
updateMessage(id, data)
deleteMessage(id)

getReactions(messageId)
setReaction(messageId, userId, reaction)

getSettings(userId)
updateSettings(userId, settings)

saveAttachment(file)
getAttachment(id)
```

The frontend should never know whether these are backed by SQLite, JSON, Netlify Blobs, etc.

---

# 34. SECURITY

Take security seriously even though there are only two users.

Implement:

* Password hashing
* Secure sessions
* HTTP-only cookies
* CSRF protection where appropriate
* Rate limiting on login
* Server-side authorization
* Input validation
* Output sanitization
* XSS protection
* File validation
* Upload limits
* Secure headers
* No secrets in frontend
* No database credentials in frontend
* No private API keys in frontend

Never use:

```javascript
const PASSWORD = "mypassword";
```

in frontend code.

Never commit:

```text
.env
```

to Git.

Provide:

```text
.env.example
```

instead.

---

# 35. XSS PROTECTION

Messages are user-generated content.

Never directly inject message HTML into the DOM.

Do not do:

```javascript
element.innerHTML = message;
```

unless content has been rigorously sanitized.

Prefer:

```javascript
element.textContent = message;
```

for plain text.

If markdown/rich text is added later, sanitize it properly.

---

# 36. API DESIGN

Create clean REST-style endpoints.

Example:

```text
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/messages
POST   /api/messages
PATCH  /api/messages/:id
DELETE /api/messages/:id

POST   /api/messages/:id/reactions
DELETE /api/messages/:id/reactions

POST   /api/messages/:id/pin
DELETE /api/messages/:id/pin

POST   /api/upload

POST   /api/presence
GET    /api/presence

GET    /api/search

GET    /api/settings
PATCH  /api/settings
```

All protected endpoints require authentication.

---

# 37. ERROR HANDLING

Never expose raw server errors to the user.

Instead of:

```text
SQLITE_CONSTRAINT_ERROR...
```

show:

```text
Something went wrong. Please try again.
```

Log technical details server-side.

Create consistent API responses.

Example:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required."
  }
}
```

---

# 38. EMPTY STATES

When there are no messages:

Display something warm and minimal:

```text
❤️ Just the two of you

This is your private space.

Send the first message.
```

Do not overdo the romantic copy.

---

# 39. LOADING STATES

Use polished skeleton/loading states.

Avoid flashing blank screens.

Messages should appear smoothly.

---

# 40. RESPONSIVE DESIGN

The application must work properly on:

* Desktop
* Laptop
* Tablet
* Android
* iPhone

On mobile:

* Chat should occupy the entire viewport
* Composer should stay accessible above the keyboard
* Menus should become bottom sheets or mobile-friendly dialogs
* No horizontal scrolling
* Touch targets should be sufficiently large

---

# 41. ACCESSIBILITY

Implement:

* Keyboard navigation
* Proper labels
* Focus states
* ARIA labels where needed
* Accessible buttons
* Sufficient contrast
* Screen-reader-friendly message controls

Do not rely only on color to communicate status.

---

# 42. PERFORMANCE

Because this is a two-person application, keep it lightweight.

Do not load the entire message history indefinitely.

Implement pagination/infinite scroll.

Example:

```text
Load newest 50 messages

↓ scroll upward

Load previous 50
```

Images should use appropriate compression/resizing.

Avoid unnecessary JavaScript dependencies.

---

# 43. SECURITY OF ATTACHMENTS

Attachments must NOT automatically become publicly accessible merely because someone knows the filename.

Attachment access should require an authenticated request.

Do not construct public predictable URLs such as:

```text
/uploads/user1/photo.jpg
```

without authorization checks.

---

# 44. NETLIFY DEPLOYMENT

Prepare the project for Netlify.

Create:

```text
netlify.toml
```

Configure:

```text
publish directory
functions directory
redirects
```

Use Netlify Functions for backend APIs.

The frontend should communicate with:

```text
/api/*
```

rather than hardcoded localhost URLs.

Use environment variables for:

```text
SESSION_SECRET
INITIAL_USER_1_PASSWORD
INITIAL_USER_2_PASSWORD
STORAGE_CONFIGURATION
```

Never expose these variables to client-side code.

---

# 45. LOCAL VS PRODUCTION STORAGE

Create a storage interface.

For example:

```text
StorageProvider
       │
       ├── LocalStorageProvider
       │       └── SQLite
       │
       └── NetlifyStorageProvider
               └── Netlify Blobs
```

Environment:

```text
NODE_ENV=development
```

uses local storage.

Production Netlify deployment uses the production provider.

Do not duplicate all application logic between the two providers.

---

# 46. INITIAL SETUP

When the application is started for the first time locally, provide an initialization mechanism that creates the two users.

For example:

```bash
npm run setup
```

Prompt for:

```text
User 1 name:
User 1 password:

User 2 name:
User 2 password:
```

Passwords must be hashed before being stored.

Do not ask for these credentials in frontend code.

---

# 47. DATABASE INITIALIZATION

Create a migration/setup process.

The first run should create:

```text
users
sessions
conversation
messages
attachments
reactions
pinned_messages
presence
settings
```

and automatically create the one private conversation.

---

# 48. BACKUP

Because this application contains personal conversations, make the storage architecture backup-friendly.

Create a local backup command such as:

```bash
npm run backup
```

that exports the local database to a backup file.

If practical, create:

```bash
npm run restore
```

as well.

Document the process in README.

---

# 49. UI DETAILS

Use subtle animations for:

* Message appearing
* Typing indicator
* Opening menus
* Opening image viewer
* Toast notifications
* Sending state
* Reaction selection

Animations should be around 150–250ms where appropriate.

Do NOT make the application overly animated.

Respect:

```text
prefers-reduced-motion
```

---

# 50. THEME

Provide a polished light and dark theme.

Light theme should feel:

```text
warm
clean
soft
```

Dark theme should feel:

```text
deep
comfortable
premium
```

Use CSS variables for all theme values.

Do not hard-code colors throughout components.

---

# 51. CHAT BACKGROUND

Allow optional subtle chat backgrounds.

Possible options:

```text
Plain
Soft gradient
Minimal pattern
Custom uploaded background
```

Keep backgrounds subtle enough that text remains easy to read.

---

# 52. MOBILE NAVIGATION

On mobile, avoid unnecessary sidebars.

Use:

```text
Chat
Memories
Settings
```

where appropriate.

The main screen should remain focused on messaging.

---

# 53. CODE QUALITY

Write clean maintainable code.

Avoid:

* Giant single files
* Duplicate logic
* Hardcoded credentials
* Hardcoded user IDs everywhere
* Inline secrets
* Unnecessary dependencies
* Dead code
* Placeholder functionality presented as finished functionality

Use reusable components/modules.

Add comments only where they explain something non-obvious.

---

# 54. ENVIRONMENT VARIABLES

Create:

```text
.env.example
```

with placeholders such as:

```text
SESSION_SECRET=
USER_1_INITIAL_PASSWORD=
USER_2_INITIAL_PASSWORD=
NETLIFY_BLOBS_STORE=
```

Do not put real secrets in the repository.

---

# 55. README

Create a detailed README containing:

## Local installation

```bash
npm install
```

## Environment setup

```text
copy .env.example to .env
```

Explain every variable.

## Initialize database

```bash
npm run setup
```

## Run locally

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Netlify deployment

Explain:

1. Push repository to GitHub
2. Create Netlify site
3. Connect GitHub repository
4. Configure environment variables
5. Configure Netlify Blobs
6. Deploy
7. Test authentication
8. Test messaging
9. Test file uploads
10. Test access from both devices

---

# 56. TESTING

Before considering the application complete, test:

### Authentication

* Correct login
* Incorrect password
* Logout
* Expired session
* Unauthorized API access

### Messaging

* Send text
* Receive text
* Refresh
* Multiple messages
* Long message
* Emoji
* Newline
* Empty message

### Message management

* Edit own message
* Cannot edit other's message
* Delete own message
* Cannot delete other's message
* Reply
* React
* Pin
* Search

### Presence

* Online
* Offline
* Last seen
* Typing

### Attachments

* Image upload
* Image preview
* File upload
* Invalid file
* Oversized file
* Unauthorized attachment access

### Security

* Direct API access without authentication
* XSS attempts
* Invalid IDs
* Malformed requests
* Rate limiting
* Session manipulation

### Responsive

* Desktop
* Android
* iPhone
* Tablet

---

# 57. IMPORTANT DEVELOPMENT RULE

Do NOT simply generate a visual mockup.

This must be a **fully functional application**.

Every visible button should either:

1. Work correctly, or
2. Be clearly marked as intentionally not implemented.

Do not create fake message sending using only frontend state.

Messages must actually persist through the backend storage layer.

---

# 58. IMPLEMENTATION ORDER

Build in this order:

### Phase 1

Project setup + architecture

### Phase 2

Authentication + sessions

### Phase 3

Storage abstraction + local SQLite

### Phase 4

Private conversation

### Phase 5

Send/load messages

### Phase 6

Real-time/near-real-time updates

### Phase 7

Read receipts + typing + presence

### Phase 8

Reactions + reply + edit + delete + pin

### Phase 9

Attachments

### Phase 10

Search

### Phase 11

Settings + profile

### Phase 12

Memories

### Phase 13

Responsive/mobile polish

### Phase 14

Security hardening

### Phase 15

Netlify deployment configuration

### Phase 16

Final testing

---

# 59. DO NOT OVERENGINEER

Remember:

There are only **two people** using this application.

Do not build:

* Group chats
* Public registration
* Public profiles
* Social feeds
* Followers
* Communities
* Complex role systems
* Enterprise permissions
* Multi-tenant architecture

Keep the codebase small, secure, understandable, and maintainable.

---

# 60. FINAL ACCEPTANCE CRITERIA

The project is complete only when:

* Two users can securely log in.
* No third user can create an account.
* Both users can access their one private conversation.
* Messages persist after page refresh.
* Messages persist after server restart.
* Messages can be sent from two different devices.
* The second user receives new messages without manually refreshing.
* Read receipts work.
* Typing indicator works.
* Online/last-seen works.
* Emoji works.
* Reactions work.
* Reply works.
* Edit works.
* Delete works.
* Pin works.
* Search works.
* Images can be uploaded and viewed.
* Files can be uploaded and downloaded securely.
* Unauthorized users cannot access private APIs.
* Passwords are hashed.
* Secrets are not exposed to the frontend.
* Local development works.
* Production architecture is compatible with Netlify.
* No data is incorrectly assumed to persist in Netlify's local filesystem.
* README contains complete setup and deployment instructions.
* No major feature is simulated with fake frontend-only data.

Before finishing, inspect the entire project for security issues, broken routes, missing imports, incorrect environment variables, API inconsistencies, and unfinished placeholder code.

Then provide a concise final report containing:

```text
1. What was built
2. Project structure
3. How to run locally
4. How authentication works
5. Where local data is stored
6. How production storage works
7. How to deploy to Netlify
8. Environment variables required
9. Security considerations
10. Known limitations
```

Do not stop after creating the UI. Build the actual working application end-to-end.
