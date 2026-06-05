from flask import Flask, request, jsonify, send_file, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_bcrypt import Bcrypt
from m3 import generate_music
import os
import datetime

app = Flask(__name__)
CORS(app, supports_credentials=True)  # Important for sessions with CORS

# Configuration
app.config['SECRET_KEY'] = 'your-secret-key-change-this'  # Change this!
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

OUTPUTS_PATH = "outputs"
os.makedirs(OUTPUTS_PATH, exist_ok=True)

# ============ DATABASE MODEL ============
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    
    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# ============ AUTHENTICATION ROUTES ============

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "")
    
    # Validation
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
    
    if len(password) < 3:  # Add your password requirements
        return jsonify({"error": "Password must be at least 3 characters"}), 400
    
    # Check if user already exists
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 409
    
    # Create new user
    new_user = User(username=username)
    new_user.set_password(password)
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({"message": "Registration successful"}), 201


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "")
    
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
    
    # Find user
    user = User.query.filter_by(username=username).first()
    
    # Check if user exists AND password matches
    if user is None or not user.check_password(password):
        return jsonify({"error": "Invalid username or password"}), 401
    
    # Log the user in
    login_user(user)
    
    return jsonify({
        "message": "Login successful",
        "username": user.username
    }), 200


@app.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logout successful"}), 200


@app.route("/check-auth", methods=["GET"])
def check_auth():
    if current_user.is_authenticated:
        return jsonify({
            "authenticated": True,
            "username": current_user.username
        }), 200
    return jsonify({"authenticated": False}), 200


# ============ PROTECTED ROUTES ============

@app.route("/generate", methods=["POST"])
@login_required  # Now requires login!
def generate():
    data = request.get_json()
    prompt = data.get("prompt", "")
    
    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400
    
    timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    output_file = os.path.join(OUTPUTS_PATH, f"{timestamp}.wav")
    
    generate_music(prompt, output_file)
    
    return jsonify({"audio_url": f"/play/{timestamp}"})


@app.route("/play/<filename>", methods=["GET"])
@login_required  # Now requires login!
def play(filename):
    path = os.path.join(OUTPUTS_PATH, f"{filename}.wav")
    if not os.path.exists(path):
        return jsonify({"error": "File not found"}), 404
    return send_file(path, mimetype="audio/wav")


@app.route("/delete/<filename>", methods=["DELETE"])
@login_required
def delete_audio(filename):
    path = os.path.join(OUTPUTS_PATH, f"{filename}.wav")

    if os.path.exists(path):
        os.remove(path)
        return jsonify({"message": "Audio clip deleted"}), 200

    return jsonify({"message": "Audio clip already removed"}), 200


# ============ INITIALIZE DATABASE ============
with app.app_context():
    db.create_all()  # Creates the database tables


if __name__ == "__main__":
    app.run(debug=True)