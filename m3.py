from transformers import AutoProcessor, MusicgenForConditionalGeneration
import torch
import librosa
import numpy as np
import joblib
import os
import soundfile as sf
import datetime
import gradio as gr

# --- Base Paths (project-relative) ---
# Use the script's directory so paths work regardless of where Python is launched from
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "dataset")
OUTPUTS_PATH = os.path.join(BASE_DIR, "outputs")
CHECKPOINTS_PATH = os.path.join(BASE_DIR, "checkpoints")

# --- Load saved components (lazy-loaded) ---
MODEL_PATH = os.path.join(CHECKPOINTS_PATH, "random_forest.joblib")
SCALER_PATH = os.path.join(CHECKPOINTS_PATH, "scaler.joblib")
LABEL_ENCODER_PATH = os.path.join(CHECKPOINTS_PATH, "label_encoder.joblib")

# Module-level placeholders for lazy loading
rf = None
scaler = None
le = None
processor = None
model = None

def ensure_models_loaded():
    """Load RandomForest components and MusicGen models on first use."""
    global rf, scaler, le, processor, model
    # Load RF artifacts
    if rf is None or scaler is None or le is None:
        print("Loading trained RandomForest components...")
        try:
            rf = joblib.load(MODEL_PATH)
            scaler = joblib.load(SCALER_PATH)
            le = joblib.load(LABEL_ENCODER_PATH)
            print("Model, Scaler, and LabelEncoder loaded successfully!\n")
        except FileNotFoundError as e:
            print(f"Checkpoint file not found: {e.filename}")
            print(f"Please ensure these files exist in: {CHECKPOINTS_PATH}")
            raise

    # Load MusicGen
    if processor is None or model is None:
        print("Loading Meta MusicGen (facebook/musicgen-small)...")
        processor = AutoProcessor.from_pretrained("facebook/musicgen-small")
        model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small")
        print("MusicGen model loaded successfully!\n")

# --- Main function: generate music from mood ---
def generate_music_from_mood(mood_text):
    if not mood_text.strip():
        return None, "Please enter a valid mood!"

    ensure_models_loaded()
    print(f"\n Generating music for mood: '{mood_text}'")

    # Step 1: Predict a genre using RandomForest
    pseudo_audio = np.random.randn(1, scaler.mean_.shape[0])
    X_scaled = scaler.transform(pseudo_audio)
    predicted_genre_index = rf.predict(X_scaled)[0]
    predicted_genre = le.inverse_transform([predicted_genre_index])[0]

    print(f"Predicted Genre: {predicted_genre}")

    # Step 2: Combine mood + genre into prompt
    full_prompt = f"{mood_text} {predicted_genre} style instrumental music"

    # Step 3: Generate with MusicGen 
    inputs = processor(
        text=[full_prompt],
        padding=True,
        return_tensors="pt",
    )

    with torch.no_grad():
        audio_values = model.generate(**inputs, max_new_tokens=768)  

    # Step 4: Save the output as WAV
    os.makedirs(OUTPUTS_PATH, exist_ok=True)
    output_file = os.path.join(
        OUTPUTS_PATH,
        f"{mood_text.replace(' ', '_')}_{predicted_genre}_{datetime.datetime.now().strftime('%H%M%S')}.wav"
    )

    sf.write(output_file, audio_values[0, 0].numpy(), model.config.audio_encoder.sampling_rate)
    print(f"Music generated and saved at: {output_file}")

    return output_file, f"Generated {predicted_genre}-style music for mood: '{mood_text}'"

def generate_music(prompt, output_file):
    """
    Flask-compatible function to generate music without Gradio.
    Saves the output WAV to output_file.
    """
    if not prompt.strip():
        return None
    
    ensure_models_loaded()

    # Step 1: Predict genre using RF
    pseudo_audio = np.random.randn(1, scaler.mean_.shape[0])
    X_scaled = scaler.transform(pseudo_audio)
    predicted_genre_index = rf.predict(X_scaled)[0]
    predicted_genre = le.inverse_transform([predicted_genre_index])[0]

    # Step 2: Combine prompt + genre
    full_prompt = f"{prompt} {predicted_genre} style instrumental music"

    # Step 3: Generate with MusicGen
    inputs = processor(text=[full_prompt], padding=True, return_tensors="pt")
    with torch.no_grad():
        audio_values = model.generate(**inputs, max_new_tokens=768)

    # Step 4: Save WAV
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    sf.write(output_file, audio_values[0, 0].numpy(), model.config.audio_encoder.sampling_rate)

    return output_file

# --- Gradio Interface ---
demo = gr.Interface(
    fn=generate_music_from_mood,
    inputs=gr.Textbox(label="Enter a Mood (e.g., 'calm and romantic', 'energetic and happy')"),
    outputs=[gr.Audio(label="Generated Music"), gr.Textbox(label="Status")],
    title="🎶 Mood-to-Music Generator",
    description="Enter a mood, and this app predicts a genre using your trained RandomForest model, then generates matching music using Meta's MusicGen.",
    theme="soft"
)

# --- Launch App ---
if __name__ == "__main__":
    demo.launch()
