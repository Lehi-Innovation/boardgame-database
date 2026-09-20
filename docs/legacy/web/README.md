# Board Game Database - Web Interface

A simple web interface for managing board game records with **drag-and-drop image uploads**.

## Quick Start

```bash
cd /home/jonny/projects/boardgame-database/web
npm install
npm start
```

Then open your browser to **http://localhost:3000**

## Features

### 🖼️ Drag-and-Drop Image Upload (Main Feature)
- Drag image files directly onto game cards
- Click "Upload Image" button as an alternative
- Automatic filename generation: `{Game Name} ({Year}).jpg`
- Images saved to `/home/jonny/projects/boardgame-database/images/`
- Support for JPG, PNG, and WEBP formats

### 🎮 Game Management
- View all 50+ detailed game entries
- Search by game name, designer, or category
- Real-time stats: "X of 50 games have images"
- Visual indicators for games with/without images

### 🎨 User Experience
- Responsive design (desktop, tablet, mobile)
- Visual feedback during uploads (loading spinners)
- Success/error toast notifications
- Smooth animations and transitions

## How to Use

1. **Start the server**: `npm start` (runs on http://localhost:3000)

2. **Upload an image**:
   - Find a game card in the grid
   - Drag an image file (JPG, PNG, or WEBP) onto the image area
   - Or click "Upload Image" button
   - Watch the progress spinner
   - Image appears on card after successful upload

3. **Search for games**:
   - Use the search bar to filter by:
     - Game name (e.g., "Azul", "Brass")
     - Designer (e.g., "Knizia", "Rosenberg")
     - Category (e.g., "Worker Placement", "Euro")

4. **Track progress**:
   - Header shows "X of 50 games have images"
   - Updates in real-time as you upload

## API Endpoints

### GET `/api/games`
List all games with metadata and image status.

**Response:**
```json
[
  {
    "id": "azul",
    "name": "Azul",
    "year": 2017,
    "designer": ["Michael Kiesling"],
    "publisher": ["Plan B Games"],
    "categories": ["Drafting", "Pattern Building"],
    "has_image": false,
    "playtime_minutes": 38,
    "min_age": 8
  }
]
```

### GET `/api/games/:id`
Get single game details with image URL if available.

### POST `/api/games/:id/upload`
Upload an image for a specific game.

**Request:** multipart/form-data with `image` field

**Response:**
```json
{
  "success": true,
  "filename": "Azul (2017).jpg",
  "path": "/api/images/Azul (2017).jpg",
  "message": "Image uploaded successfully"
}
```

### GET `/api/images/:filename`
Serve image files from the images directory.

### GET `/api/health`
Health check endpoint.

## File Structure

```
web/
├── server.js              # Express backend with API
├── package.json           # Dependencies
├── package-lock.json      # Lock file
├── public/
│   └── index.html         # Single-file frontend
└── lib/
    └── yaml-handler.js    # YAML parsing utilities
```

## Technical Details

- **Frontend**: Single HTML file with embedded CSS/JavaScript (no build process)
- **Backend**: Node.js with Express
- **YAML Parsing**: js-yaml with formatting preservation
- **File Uploads**: Multer with in-memory processing
- **Image Validation**: Sharp library for format and dimension checking

## Image Organization

Images are stored in `/images/` directory with naming convention:
```
{Game Name} ({Year}).{extension}
```

Examples:
- `Azul (2017).jpg`
- `Brass: Birmingham (2018).png`
- `Ark Nova (2021).webp`

This naming convention allows automatic image association without modifying YAML files, keeping the database git-friendly.

## Error Handling

The interface handles common errors gracefully:
- Invalid file types (only images allowed)
- File too large (max 20MB)
- Missing games (404)
- Server errors (500)

All errors are shown as toast notifications with helpful messages.

## Development

To run with auto-reload on file changes:
```bash
npm run dev
```

This requires nodemon to be installed (included in devDependencies).

## Limitations & Future Enhancements

**Current Limitations:**
- No authentication (add if deploying publicly)
- Images stored locally (consider cloud storage for larger deployments)
- No image editing/cropping (upload as-is)

**Potential Enhancements:**
- Bulk image upload
- Image preview/editing before upload
- Game metadata editing through web interface
- Master list integration (pick games to add)
- Play tracking/session logging
- User authentication
- Admin panel

## Troubleshooting

### Port 3000 already in use
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9
# Then restart
npm start
```

### Dependencies won't install
```bash
rm -rf node_modules package-lock.json
npm install
```

### Images not showing
- Ensure image filename matches: `{Game Name} ({Year}).{ext}`
- Check file is in `/images/` directory
- Reload browser page (hard refresh: Ctrl+F5 or Cmd+Shift+R)

## Questions or Issues?

Check the DEV_LOG.md in the parent directory for implementation details and architecture decisions.
