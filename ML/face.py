from flask import request, jsonify
import tempfile
import os
from deepface import DeepFace
import cv2
import matplotlib.pyplot as plt

# Set matplotlib to use a non-interactive backend to prevent pop-up windows
plt.switch_backend('Agg')

# Force TensorFlow to use CPU
os.environ["CUDA_VISIBLE_DEVICES"] = ""

def preprocess_image(image_path):
    """
    Preprocess the image to improve quality and save it temporarily.
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image from {image_path}")

    # Resize image (optional)
    img = cv2.resize(img, (500, 500))

    # Convert to grayscale (optional)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Apply histogram equalization (optional)
    gray = cv2.equalizeHist(gray)

    # Save the preprocessed image to a temporary file
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp_file:
        preprocessed_path = temp_file.name
        cv2.imwrite(preprocessed_path, gray)

    return preprocessed_path

def visualize_face(image_path, face_location):
    """
    Visualize the detected face on the image and save it temporarily.
    """
    img = cv2.imread(image_path)
    x, y, w, h = face_location['x'], face_location['y'], face_location['w'], face_location['h']

    # Draw a rectangle around the face
    cv2.rectangle(img, (x, y), (x + w, y + h), (0, 255, 0), 2)

    # Save the image with the detected face to a temporary file
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp_file:
        output_path = temp_file.name
        cv2.imwrite(output_path, img)

    return output_path

def analyze_image(image_path):
    """
    Analyze an image for age, gender, emotion, and race using DeepFace.

    Parameters:
        image_path (str): Path to the image file.

    Returns:
        list: Analysis results for each detected face as a list of dictionaries.
    """
    # Check if image file exists
    if not os.path.isfile(image_path):
        raise FileNotFoundError(f"The file {image_path} does not exist. Please check the file path.")

    # Preprocess the image
    preprocessed_path = preprocess_image(image_path)

    # Analyze image with DeepFace for each action separately
    analysis_data = []
    try:
        # Analyze age with a specific backend
        age_results = DeepFace.analyze(
            img_path=preprocessed_path,
            actions=["age"],
            detector_backend='opencv',  # Specify backend for age opencv retinaface mtcnn ssd
            enforce_detection=False
        )

        # Analyze gender with a different backend
        gender_results = DeepFace.analyze(
            img_path=preprocessed_path,
            actions=["gender"],
            detector_backend='retinaface',  # Specify backend for gender
            enforce_detection=False
        )

        # Analyze emotion with another backend
        emotion_results = DeepFace.analyze(
            img_path=preprocessed_path,
            actions=["emotion"],
            detector_backend='mtcnn',  # Specify backend for emotion
            enforce_detection=False
        )

        # Analyze race with another backend
        race_results = DeepFace.analyze(
            img_path=preprocessed_path,
            actions=["race"],
            detector_backend='ssd',  # Specify backend for race
            enforce_detection=False
        )

        # Combine results
        for i in range(len(age_results)):
            age = age_results[i]['age']
            gender_dict = gender_results[i]['gender']
            dominant_gender = max(gender_dict, key=gender_dict.get)
            gender_confidence = gender_dict[dominant_gender]
            emotion = emotion_results[i]['dominant_emotion']
            race = race_results[i]['dominant_race']
            face_location = age_results[i]['region']

            person_info = {
                "Person": i + 1,
                "Age": age,
                "Gender": {
                    "Dominant": dominant_gender,
                    "Confidence": gender_confidence
                },
                "Emotion": emotion,
                "Race": race,
                "Face Location": {
                    "x": face_location['x'],
                    "y": face_location['y'],
                    "w": face_location['w'],
                    "h": face_location['h']
                }
            }
            analysis_data.append(person_info)

            # Visualize the detected face (without pop-up)
            detected_face_path = visualize_face(preprocessed_path, face_location)
            # Optionally, you can delete the temporary detected face file immediately
            os.unlink(detected_face_path)

    except Exception as e:
        print(f"Error analyzing image: {e}")
        return []
    finally:
        # Clean up the temporary preprocessed image file
        if os.path.exists(preprocessed_path):
            os.unlink(preprocessed_path)

    return analysis_data

def analyze_route():
    """
    Flask route for analyzing an image.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp_file:
            file_path = temp_file.name
            file.save(file_path)
        
        try:
            # Use the analyze_image function
            results = analyze_image(file_path)
            
            # Check if faces were detected
            if not results:
                return jsonify({'error': 'No faces detected'}), 400
                
            # Correctly format the response
            response_data = []
            for person in results:
                response_data.append({
                    'Age': person['Age'],
                    'Gender': person['Gender']['Dominant'],
                    'Gender_Confidence': person['Gender']['Confidence'],
                    'Emotion': person['Emotion'],
                    'Race': person['Race'],
                    'Face_Location': person['Face Location']
                })
            
            return jsonify(response_data), 200
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        finally:
            # Clean up the temporary uploaded file
            if os.path.exists(file_path):
                os.unlink(file_path)
