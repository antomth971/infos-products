# Web Scraper

Secure web scraping application with modern user interface and multi-provider support.

## Project Structure

```
infos_product/
├── backend/           # Node.js server
│   ├── server.js      # Express API
│   ├── models/        # MongoDB models
│   │   └── Product.js
│   └── package.json   # Backend dependencies
├── frontend/          # User interface
│   ├── index.html     # Main page
│   ├── login.html     # Login page
│   ├── style.css      # Styles
│   └── app.js         # JavaScript logic
└── README.md
```

## Features

### 🔐 Security
- **Customizable access code authentication**
- **Secure 4-hour session** on device
- **Deletion protection** with different confirmation code
- Automatic redirection to login page if not connected

### 🌐 Multi-provider Scraping
Support for multiple e-commerce websites:
- **Vevor** (.vevor.)
- **Amazon** (www.amazon.)
- **Cdiscount** (www.cdiscount.com)
- **Manomano** (www.manomano.fr)
- **Gifi** (www.gifi.fr)
- **Leroy Merlin** (www.leroymerlin.fr)
- **AliExpress** (.aliexpress.)
- **Bol.com** (www.bol.com)

### 📦 Data Extraction
- Product titles
- Prices (formatted according to supplier)
- Detailed descriptions
- High-resolution images
- Source URL
- Date added

### 🛠️ Advanced Features
- **Puppeteer**: Anti-bot protection bypass
- **Batch processing**: Scan multiple URLs simultaneously
- **Excel export**: Download all products in XLSX format
- **ZIP download**: Images grouped by product
- **Real-time search** by product name
- **Chronological sorting**: Display from oldest to newest
- **MongoDB database**: Persistent and high-performance storage
- Already scanned URL verification
- Responsive and modern interface

## Installation

### Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** (local or MongoDB Atlas)

### 1. Backend Installation

```bash
cd backend
npm install
```

### 2. MongoDB Configuration

Create a `.env` file in the `backend/` folder:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/web-scraper
# or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/web-scraper

# Access codes (customizable)
ACCESS_CODE=ABC12345        # Code to access the site
DELETE_CODE=DEL98765        # Code to delete a product

# Session
SESSION_SECRET=your-super-secret-to-change

# Port (optional)
PORT=3000
```

**Note**: If using MongoDB Atlas, refer to `MONGODB_SETUP.md` for more details.

### 3. Frontend

No installation required for the frontend (vanilla HTML/CSS/JS).

## Usage

### 1. Start the Backend Server

```bash
cd backend
npm start
```

The server starts on http://localhost:3000 and displays:
```
✓ Server started on http://localhost:3000

🔐 Access codes:
   - Site access code: ABC12345
   - Deletion code: DEL98765

⏱️  Session duration: 4 hours
```

### 2. Login

1. Open http://localhost:3000 in your browser
2. You will be automatically redirected to the login page
3. Enter the **access code** (default: `ABC12345`)
4. Click "Access"

Once logged in, you have access to the site for **4 hours**.

### 3. Using the Application

#### Scan a Product
1. Enter a product URL in the input field
2. Click "Scraper"
3. Wait for the extraction to complete (loader visible)
4. The product appears in the left list
5. Click on a product to see its full details

#### Scan Multiple Products
1. Enter multiple URLs (one per line) in the input field
2. Click "Scraper"
3. A summary is displayed once processing is complete

#### Delete a Product
1. Click the 🗑️ button next to the product
2. Enter the **deletion code** (default: `DEL98765`)
3. Confirm deletion

#### Excel Export
Click "📊 Export to Excel" to download all products in an Excel file.

#### Download Images
In product details, click "📥 Download all images" to get a ZIP file with all product images.

## Backend API

### Authentication

#### GET /api/auth/check
Check if user is logged in.

**Response:**
```json
{
  "authenticated": true
}
```

#### POST /api/auth/login
Login with access code.

**Body:**
```json
{
  "code": "ABC12345"
}
```

**Response (success):**
```json
{
  "success": true,
  "message": "Access granted"
}
```

**Response (error):**
```json
{
  "success": false,
  "error": "Invalid code"
}
```

#### POST /api/auth/logout
Logout.

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### Products

#### POST /api/scrape
Extract data from a web page and save it to MongoDB.

**Body:**
```json
{
  "url": "https://www.vevor.fr/produit/..."
}
```

**Response (success):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Product title",
    "price": "29,99 €",
    "description": ["Item 1", "Item 2"],
    "images": ["url1.jpg", "url2.jpg"],
    "url": "https://...",
    "supplier": "Vevor",
    "createdAt": "2025-01-01T12:00:00.000Z"
  },
  "usedPuppeteer": true
}
```

**Response (URL already scanned):**
```json
{
  "success": false,
  "error": "URL already scanned",
  "alreadyScanned": true
}
```

#### GET /api/items
Retrieve all products (sorted from oldest to newest).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "Product 1",
      "price": "29,99 €",
      "description": ["..."],
      "images": ["..."],
      "url": "...",
      "supplier": "Vevor",
      "createdAt": "..."
    }
  ]
}
```

#### DELETE /api/items/:id
Delete a product (requires authentication + deletion code).

**Body:**
```json
{
  "deleteCode": "DEL98765"
}
```

**Response (success):**
```json
{
  "success": true,
  "data": []
}
```

**Response (not authenticated):**
```json
{
  "success": false,
  "error": "Unauthorized access. Please log in."
}
```

**Response (invalid code):**
```json
{
  "success": false,
  "error": "Invalid deletion code"
}
```

### Export

#### GET /api/export/excel
Export all products to Excel file (.xlsx).

**Response:** Downloadable Excel file

#### POST /api/download-image
Proxy to download images (CORS bypass).

**Body:**
```json
{
  "url": "https://image.example.com/photo.jpg"
}
```

**Response:** Image blob

### Health

#### GET /api/health
Check server status.

**Response:**
```json
{
  "status": "OK",
  "message": "API is running"
}
```

## Technologies Used

### Backend
- **Node.js** (v20+)
- **Express** - Web framework
- **MongoDB** + **Mongoose** - NoSQL database
- **express-session** - Session management
- **Puppeteer** - Browser automation and anti-bot bypass
- **Axios** - HTTP requests
- **Cheerio** - HTML parsing
- **XLSX** - Excel export
- **CORS** - Cross-Origin Resource Sharing
- **dotenv** - Environment variables

### Frontend
- **HTML5**
- **CSS3** (Grid, Flexbox, Animations)
- **JavaScript** (ES6+)
- **JSZip** - ZIP file creation
- Fetch API with credentials

## Development

For development with automatic reload:

```bash
cd backend
npm run dev
```

The server will automatically restart with each modification using **nodemon**.

## Security

### Access Codes
Default codes are:
- **Site access**: `ABC12345`
- **Deletion**: `DEL98765`

⚠️ **Important**: Change these codes in the `.env` file in production!

### Sessions
- Duration: **4 hours**
- HttpOnly cookie for enhanced security
- Session invalidated after expiration

### Best Practices
1. Never share the `.env` file
2. Use complex codes in production
3. Enable HTTPS in production (`secure: true` in cookies)
4. Configure a strong `SESSION_SECRET`

## Notes

- **Database**: MongoDB (no more JSON file)
- **Sorting**: Products are displayed from oldest to newest
- **Images**: Downloaded in high resolution when available
- **Anti-bot**: Puppeteer simulates a real browser
- **Batch**: Ability to scan multiple URLs at once
- **Export**: Excel format with all data
- **ZIP**: Images grouped by product
- Deleted products are permanently removed from MongoDB
