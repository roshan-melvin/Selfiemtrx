from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import base64
import os
import tempfile
from face import analyze_image
from height import estimate_height
from object import detect_objects  # Import the function from object.py

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins

def load_dataset(file_path):
    """
    Load a dataset from a CSV file.
    """
    try:
        return pd.read_csv(file_path)
    except Exception as e:
        print(f"Error loading dataset: {e}")
        return None

def parse_numeric_range(value):
    """
    Parse a numeric range (e.g., "160-180") into a tuple of floats.
    """
    try:
        if isinstance(value, (int, float, np.int64, np.float64)):
            return float(value)
        if isinstance(value, str) and '-' in value:
            low, high = map(float, value.split('-'))
            return (low, high)
        return float(value)
    except ValueError:
        return None

def estimate_total_height_and_weight(estimated_head_height, age, gender, country, height_dataset):
    """
    Estimate total height and weight based on head height, age, gender, and country.
    """
    dataset_based_low, dataset_based_high = None, None
    default_low, default_high = None, None
    weight_range = None

    if height_dataset is not None:
        if 'Gender' in height_dataset.columns and 'Country' in height_dataset.columns:
            height_dataset['Gender'] = height_dataset['Gender'].str.lower()
            height_dataset['Country'] = height_dataset['Country'].str.lower()
            gender, country = gender.lower(), country.lower()

            filtered_data = height_dataset[(height_dataset['Age'] == age) & (height_dataset['Gender'] == gender) & (height_dataset['Country'] == country)]
            if not filtered_data.empty:
                dataset_based_low, dataset_based_high = map(parse_numeric_range, filtered_data[['Min_Height', 'Max_Height']].values[0])
                weight_range = filtered_data['Avg_weight'].values[0]
            else:
                print("No matching data found in height dataset")

        filtered_ratio = height_dataset[(height_dataset['Age'] == age) & (height_dataset['Gender'] == gender) & (height_dataset['Country'] == country)]
        if not filtered_ratio.empty:
            ratio_low, ratio_high = map(float, filtered_ratio[['Head_to_Body_Ratio_Low', 'Head_to_Body_Ratio_High']].values[0])
            if ratio_low > 0 and ratio_high > 0:
                corrected_height_low = estimated_head_height / ratio_low
                corrected_height_high = estimated_head_height / ratio_high
                print(f"✅ Corrected Estimated Height: {corrected_height_low:.2f} - {corrected_height_high:.2f}")
                default_low, default_high = corrected_height_low, corrected_height_high
            else:
                print("Invalid head-to-body ratio values")
                default_low, default_high = None, None
        else:
            print("No matching data found in ratio dataset")

    if dataset_based_low is not None and dataset_based_high is not None and default_low is not None and default_high is not None:
        refined_low, refined_high = max(dataset_based_low, default_low), min(dataset_based_high, default_high)
        if refined_low <= refined_high:
            return dataset_based_low, dataset_based_high, default_low, default_high, refined_low, refined_high, weight_range, "overlap"
        else:
            final_height = (0.7 * (dataset_based_low + dataset_based_high) / 2 + 0.3 * (estimated_head_height * (ratio_low + ratio_high) / 2)) / (0.7 + 0.3)
            return dataset_based_low, dataset_based_high, default_low, default_high, final_height, None, weight_range, "not_found"
    return None, None, default_low or 0, default_high or 0, default_low or 0, default_high or 0, weight_range, "dataset_not_available"

@app.route('/analyze', methods=['POST'])
def analyze():
    """
    Analyze an image for age, gender, height, weight, and detected objects.
    """
    data = request.json
    image_data = data['image']
    country = data['country']

    # Decode the base64 image
    image_bytes = base64.b64decode(image_data.split(',')[1])

    # Save the image to a temporary file
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp_file:
        image_path = temp_file.name
        temp_file.write(image_bytes)

    # Load the height dataset
    dataset_path = "height.csv"
    height_dataset = load_dataset(dataset_path)

    # Analyze the image
    results = analyze_image(image_path)
    height_depth, height_reference = estimate_height(image_path)

    if height_depth and results:
        age, gender = results[0]['Age'], results[0]['Gender']['Dominant']
        emotion = results[0]['Emotion']  # Extract emotion
        race = results[0]['Race']  # Extract race
        estimated_head_height_depth, estimated_head_height_reference = height_depth, height_reference

        # Estimate total height and weight
        dataset_based_low, dataset_based_high, default_low, default_high, refined_result_depth, refined_high_depth, weight_range, status_depth = estimate_total_height_and_weight(
            estimated_head_height_depth, age, gender, country, height_dataset
        )

        if estimated_head_height_reference:
            dataset_based_low, dataset_based_high, default_low, default_high, refined_result_reference, refined_high_reference, weight_range, status_reference = estimate_total_height_and_weight(
                estimated_head_height_reference, age, gender, country, height_dataset
            )
        else:
            refined_result_reference, status_reference = None, "reference_not_available"

        # Detect objects in the image
        detected_objects, output_image_path = detect_objects(image_path)

        # Convert pixel heights to real-world heights (if a reference is available)
        if refined_result_depth:
            # Assume the person's height is refined_result_depth (in cm)
            person_height_cm = refined_result_depth
            # Find the height of the person in pixels
            person_object = next((obj for obj in detected_objects if obj["object_name"] == "person"), None)
            if person_object:
                person_height_pixels = person_object["height_pixels"]
                # Calculate scaling factor (cm per pixel)
                scaling_factor = person_height_cm / person_height_pixels
                # Update object heights in cm
                for obj in detected_objects:
                    obj["height_cm"] = obj["height_pixels"] * scaling_factor

        # Prepare the response
        response = {
            "age": age,
            "gender": gender,
            "country": country,
            "emotion": emotion,  # Include emotion in the response
            "race": race,  # Include race in the response
            "height_depth_based": refined_result_depth,
            "height_reference_based": refined_result_reference,
            "weight_range": weight_range,
            "detected_objects": detected_objects,
            "output_image_path": output_image_path
        }

        # Clean up the temporary image file
        os.remove(image_path)
        return jsonify(response)

    # Clean up the temporary image file
    os.remove(image_path)
    return jsonify({"error": "Failed to process image"}), 400

if __name__ == '__main__':
    app.run(debug=True)
