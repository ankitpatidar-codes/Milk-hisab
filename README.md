# 🥛 Milk Hisab - Personal Milk Tracking Application

A production-ready, mobile-friendly personal web application to track daily milk purchases, calculate monthly bills, record payments, and generate monthly reports.

Designed specifically for personal household milk management with daily milkmen.

---

## 🌟 Key Features

1. **Daily Milk Entry**
   - Select any date (defaults to today)
   - Toggle milk received: **Yes** or **No**
   - Record quantity in litres (e.g. 1.0, 1.5, 2.0)
   - Set rate per litre (auto-populates default from settings)
   - Automatic real-time calculation of daily total amount (₹)
   - Easily edit or update previous entries without duplicates (unique constraint on user + date)

2. **Monthly Calendar View**
   - 🟢 **Green**: Milk received on this day (displays quantity in litres)
   - 🔴 **Red**: Milk not received (missed day)
   - ⚪ **Grey**: No entry recorded yet
   - Highlight on current day
   - Click any date cell to directly open the entry modal and add/update record
   - Navigate effortlessly between previous and next months

3. **Automatic Monthly Billing & Calculations**
   - Total milk quantity consumed for the month
   - Total monthly bill calculation
   - Count of days milk was received
   - Count of missed/skipped milk days
   - Real-time automatic recalculation whenever any entry is modified

4. **Payment & Balance Management**
   - Record payment date, amount (₹), and payment notes (e.g., UPI, GPay, Cash)
   - Real-time monthly paid total
   - Automatic **carry forward** of previous months' unpaid balance
   - Up-to-date net pending balance display
   - Delete incorrect payment entries

5. **Interactive Dashboard**
   - Today's milk status card
   - Current month's total litres, total bill, and net pending balance
   - Days received vs days missed indicators
   - Interactive 6-month historical milk consumption and billing bar chart (powered by Chart.js)

6. **Monthly Reports & PDF Export**
   - Full date-wise itemized milk consumption breakdown
   - Payment history listing
   - Previous pending carry-forward + current month bill = total due summary
   - Clean, printable format ready for **Save as PDF** or physical printing

7. **Security & Authentication**
   - Secure username/password authentication
   - PBKDF2 password hashing via Werkzeug
   - Flask session-based authentication with automatic redirect to setup on first launch
   - Protected API and view routes via `@login_required`
   - Zero hardcoded database credentials or sensitive secrets in code

---

## 📁 Project Structure

```
milk-hisab/
├── app.py                 # Flask application factory, routing & API endpoints
├── config.py              # Environment configuration (Dev & Prod)
├── models.py              # SQLAlchemy database models (User, MilkEntry, Payment, Settings)
├── requirements.txt       # Production dependencies
├── Procfile               # Deployment entrypoint for Render & Railway
├── gunicorn_config.py     # Production WSGI server tuning
├── render.yaml            # Render Blueprint for 1-click web + PostgreSQL deploy
├── railway.toml           # Railway deployment configuration
├── nixpacks.toml          # Nixpacks build specifications
├── .env.example           # Environment variable template
├── .gitignore             # Standard ignore rules for Python, DBs, and env files
├── README.md              # Complete guide & documentation
├── templates/
│   ├── base.html          # Base layout with navbar, entry modal, and bootstrap
│   ├── login.html         # Login page
│   ├── setup.html         # First-time account creation
│   ├── dashboard.html     # Real-time metrics and Chart.js visualization
│   ├── calendar.html      # Color-coded interactive monthly calendar
│   ├── payments.html      # Payment entry, log, and balance summary
│   ├── reports.html       # Itemized report with print/PDF styling
│   ├── settings.html      # Default rate & quantity preferences
│   ├── 404.html           # Friendly 404 error page
│   └── 500.html           # Server error page
└── static/
    ├── css/
    │   └── style.css      # Custom responsive styling and calendar layout
    └── js/
        ├── app.js         # Shared utilities, toast alerts, entry modal handler
        ├── dashboard.js   # Dashboard data fetching and chart rendering
        ├── calendar.js    # Monthly calendar grid generation
        ├── payments.js    # Payment CRUD interactions
        ├── reports.js     # Report data binding and print triggers
        └── settings.js    # Settings updates
```

---

## 💻 1. How to Run Locally

### Prerequisites
- Python 3.8+ installed on your computer

### Steps

1. **Open your terminal / command prompt** and navigate to the project directory:
   ```bash
   cd "C:\Users\My Laptop\.gemini\antigravity\scratch\milk-hisab"
   ```

2. **Create a virtual environment (recommended)**:
   ```bash
   # Windows:
   python -m venv venv
   .\venv\Scripts\activate

   # Linux / macOS:
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   python -m pip install -r requirements.txt
   ```

4. **Setup environment file**:
   ```bash
   # Copy .env.example to .env
   copy .env.example .env    # On Windows
   cp .env.example .env      # On Linux / macOS
   ```

   For local development, the default SQLite setting (`DATABASE_URL=sqlite:///milk_hisab.db`) works out of the box with zero external installation.

5. **Start the local server**:
   ```bash
   python app.py
   ```

6. **Open in your browser**:
   Navigate to **http://localhost:5000**
   - On first launch, you will be redirected to `/setup` to create your initial username and password.
   - Afterwards, log in at `/login` and start recording your milk entries!

---

## 🐘 2. How to Configure PostgreSQL

### Option A: Local PostgreSQL
1. Install PostgreSQL and start the service.
2. In `psql` or pgAdmin, create a database and user:
   ```sql
   CREATE DATABASE milk_hisab;
   CREATE USER milkuser WITH ENCRYPTED PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE milk_hisab TO milkuser;
   ```
3. In your `.env` file, set:
   ```env
   DATABASE_URL=postgresql://milkuser:your_secure_password@localhost:5432/milk_hisab
   ```
4. Run `python app.py`. SQLAlchemy will automatically create all tables (`users`, `milk_entries`, `payments`, `settings`) upon startup.

---

## 🚀 3. How to Deploy Online (Render or Railway)

### Option A: Deploy on Render (Recommended & Free)

Render provides free hosting for web services and free PostgreSQL databases.

#### Using Render Blueprint (Easiest):
1. Push this project to your GitHub repository (e.g. `https://github.com/your-username/milk-hisab`).
2. Log into [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Blueprint**.
4. Select your GitHub repository.
5. Render reads `render.yaml` and automatically configures:
   - A Python 3 web service
   - A managed PostgreSQL database (`milk-hisab-db`)
   - Links `DATABASE_URL` and creates a random `SECRET_KEY`
6. Click **Apply**. Render will build and deploy your app.

#### Manual Setup on Render:
1. **Create PostgreSQL Database**:
   - Go to **New +** → **PostgreSQL**.
   - Name: `milk-hisab-db`, Plan: **Free**.
   - After creation, copy the **Internal Database URL** (e.g. `postgres://milkuser:...@dpg-.../milk_hisab`).
2. **Create Web Service**:
   - Go to **New +** → **Web Service** → Connect your GitHub repo.
   - Environment: `Python 3`.
   - Build Command: `pip install -r requirements.txt`.
   - Start Command: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --threads 2`.
3. **Set Environment Variables**:
   - `DATABASE_URL`: Paste the Internal Database URL from step 1.
   - `SECRET_KEY`: Enter a random 32-character string.
   - `FLASK_ENV`: `production`.
4. Click **Create Web Service**.

---

### Option B: Deploy on Railway

1. Log into [Railway.app](https://railway.app).
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select your repository.
4. Add PostgreSQL:
   - In the project canvas, click **+ New** → **Database** → **PostgreSQL**.
5. Connect database to web service:
   - Under your web service settings, go to **Variables**.
   - Add reference variable: `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`.
   - Add `SECRET_KEY` = your generated secret key.
   - Add `FLASK_ENV` = `production`.
6. Go to **Settings** → **Networking** → Click **Generate Domain**.

---

## 🔗 4. How to Access Your Website

Once deployed, your service will receive a public HTTPS URL:
- Render: `https://milk-hisab-xxxx.onrender.com`
- Railway: `https://milk-hisab-production.up.railway.app`

### Access from any Device:
- **Mobile Phones (Android Chrome, iOS Safari)**: Simply open the URL in Chrome or Safari.
  - *Tip*: Tap browser settings → **"Add to Home Screen"** to use it like a native mobile app!
- **Laptops / Desktop PCs**: Open in Google Chrome, Microsoft Edge, Firefox, or Safari.

---

## 🔒 5. Database Schema & Persistence

All tables are defined with strict constraints to ensure zero data loss across server restarts:

| Table | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `users` | `id` | Integer | PK, Auto | Unique User ID |
| `users` | `username` | String(80) | Unique, Index | User login name |
| `users` | `password_hash` | String(256) | Not Null | PBKDF2 hash |
| `milk_entries` | `id` | Integer | PK, Auto | Entry ID |
| `milk_entries` | `user_id` | Integer | FK(`users.id`) | Cascade on delete |
| `milk_entries` | `date` | Date | Not Null, Index | Entry date |
| `milk_entries` | `received` | Boolean | Default True | Received or missed |
| `milk_entries` | `quantity` | Float | Default 0.0 | Volume in litres |
| `milk_entries` | `rate` | Float | Default 0.0 | Rate in ₹ |
| `milk_entries` | `amount` | Float | Default 0.0 | Daily total |
| `payments` | `id` | Integer | PK, Auto | Payment ID |
| `payments` | `user_id` | Integer | FK(`users.id`) | User reference |
| `payments` | `date` | Date | Not Null | Date payment made |
| `payments` | `amount` | Float | Not Null | Amount in ₹ |
| `payments` | `notes` | String(500) | Optional | Payment remarks |
| `payments` | `month`, `year` | Integer | Not Null | Applicable billing cycle |
| `settings` | `user_id` | Integer | FK, Unique | User preferences |
| `settings` | `default_rate` | Float | Default 60.0 | Default rate per litre |
| `settings` | `default_quantity`| Float | Default 1.0 | Default daily litres |

**Data Safety Guaranteed:**
- `uq_user_date` unique constraint ensures you can never have accidental duplicate entries for the same date.
- Updating an existing date updates the record in-place instead of creating duplicates.
- All relationships use `cascade='all, delete-orphan'`.
- Production PostgreSQL stores data persistently in disk volumes; app container redeploys never affect stored data.
