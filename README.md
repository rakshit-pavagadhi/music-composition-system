# AI-Based Music Composition System

**Project**: Mood-to-Music Generator — a small app that predicts a music genre using a lightweight RandomForest classifier and then synthesizes matching instrumental audio using Meta's MusicGen model.

**Repository layout**
- **`app.py`**: Flask backend providing register/login and `/generate` endpoints. See [app.py](app.py).
- **`m3.py`**: Core ML + generation code and an optional Gradio demo. See [m3.py](m3.py).
- **`requirements.txt`**: Python dependencies. See [requirements.txt](requirements.txt).
- **`checkpoints/`**: Saved ML artifacts (RandomForest, scaler, label encoder). Example files are in this folder: [checkpoints/label_encoder.joblib](checkpoints/label_encoder.joblib), [checkpoints/random_forest.joblib](checkpoints/random_forest.joblib), [checkpoints/scaler.joblib](checkpoints/scaler.joblib).
- **`dataset/`**: Audio dataset organized by genre (subfolders like `blues`, `classical`, `country`, `disco`, `hiphop`, `jazz`, `metal`, `pop`, `reggae`, `rock`...).
- **`frontend/`**: Static frontend pages (`index.html`, `home.html`, `script.js`, `style.css`).
- **`outputs/`**: Generated WAV files are saved here at runtime.

**Quick Summary**
- Purpose: Convert a short text mood/prompt into a genre prediction (via RandomForest) and then generate audio using MusicGen.
- Two ways to use: a) run the Flask API (`app.py`) and call `/generate`, or b) launch the Gradio demo in `m3.py` for a local web UI.

**Tech Stack & Key Libraries**
- **Language**: Python 3.8+
- **Web / UI**: Flask, Flask-CORS, Flask-Login, Flask-Bcrypt
- **ML & Audio**: PyTorch, Transformers (Meta MusicGen), Torchaudio, Librosa, SoundFile
- **Classic ML utilities**: scikit-learn artifacts saved/loaded via `joblib` (RandomForest, scaler, label encoder)
- **Other**: NumPy, Gradio (optional demo)

These libraries are listed in [requirements.txt](requirements.txt).

**Dataset**
- The project expects a dataset in the `dataset/` directory organized into genre subfolders (e.g., `blues/`, `classical/`, `country/`, `disco/`, `hiphop/`, `jazz/`, `metal/`, `pop/`, `reggae/`, `rock/`). This structure mirrors GTZAN-like genre folders and is used for training the classic ML components (not included here).

**Checkpoints & Outputs**
- Required checkpoint files (placed under [checkpoints/](checkpoints)):
	- `random_forest.joblib` — trained RandomForest classifier
	- `scaler.joblib` — feature scaler used during training
	- `label_encoder.joblib` — label encoder mapping genre indices to names
- Generated WAVs are saved to [outputs/](outputs) by default. The Flask endpoint returns a playable URL, and the Gradio demo returns audio directly.

**Hardware / Performance Notes**
- Meta MusicGen is large and may require significant RAM and compute. For reasonable speed, run with a CUDA-enabled GPU and an appropriate PyTorch build. On CPU it will be slow and may be memory-limited.

**Security note**
- Change the default `SECRET_KEY` in [app.py](app.py) before deploying publicly. The Flask app currently contains a placeholder: `app.config['SECRET_KEY'] = 'your-secret-key-change-this'`.

**Database (`users.db`)**
- The application uses SQLite to store registered users via SQLAlchemy. The default connection is `sqlite:///users.db` (set in [app.py](app.py)).
- Location: `users.db` is created in the project root the first time the app runs (the file is created automatically by `db.create_all()`).
- Inspect / reset: open `users.db` with any SQLite viewer (e.g., `sqlite3`, DB Browser for SQLite). To reset user accounts during development, stop the app and delete the `users.db` file.
- Production: for production deployments replace `sqlite:///users.db` with a managed database (Postgres/MySQL) via `SQLALCHEMY_DATABASE_URI` in environment variables, enable migrations (Alembic/Flask-Migrate), and ensure a secure `SECRET_KEY` and HTTPS.

**Setup & Run (Windows PowerShell examples)**
1) Create & activate a virtual environment
```powershell
python -m venv venv
& "venv\\Scripts\\Activate.ps1"
```

2) Upgrade pip and install dependencies
```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

3) Ensure checkpoint artifacts are present
```powershell
# place the following files into the checkpoints folder:
# checkpoints\\random_forest.joblib
# checkpoints\\scaler.joblib
# checkpoints\\label_encoder.joblib
```

4a) Run the Flask backend (serves API used by `frontend/index.html`):
```powershell
python app.py
```

4b) Or run the Gradio demo directly (quick local UI):
```powershell
python m3.py
```

**API Endpoints (summary)**
- `POST /register` — JSON: `{ "username": "...", "password": "..." }` — registers a new user.
- `POST /login` — JSON: `{ "username": "...", "password": "..." }` — logs in and creates a session.
- `POST /generate` — JSON: `{ "prompt": "your prompt text" }` — requires login; returns `{"audio_url": "/play/<timestamp>"}`.
- `GET /play/<filename>` — returns generated WAV file (requires login).

Example curl (register -> login -> generate) — note: Flask uses session cookies; for simple testing use the Gradio demo instead.
