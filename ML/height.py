import cv2
import numpy as np
import torch
from torchvision.transforms import Compose, Normalize, ToTensor
from ultralytics import YOLO
from mtcnn import MTCNN

# Camera calibration parameters
FOCAL_LENGTH_PIXEL = 1550  # Ensure this is correct for your camera in pixels
MIN_DEPTH = 0.35  # Minimum valid depth in meters
MAX_DEPTH = 3.0  # Maximum valid depth in meters
DEFAULT_DEPTH = 1.55  # Default depth in meters if estimation fails

def load_midas_model():
    # Load MiDaS model for depth estimation
    model = torch.hub.load("intel-isl/MiDaS", "MiDaS_small")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device).eval()
    transform = Compose([
        ToTensor(),
        Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    return model, transform, device

def estimate_depth(image, model, transform, device):
    # Estimate depth for the input image
    original_height, original_width, _ = image.shape
    resized_image = cv2.resize(image, (384, 384))
    image_rgb = cv2.cvtColor(resized_image, cv2.COLOR_BGR2RGB)
    image_tensor = transform(image_rgb).unsqueeze(0).to(device)
    with torch.no_grad():
        depth = model(image_tensor).squeeze().cpu().numpy()
    depth = cv2.resize(depth, (original_width, original_height))
    depth = cv2.medianBlur(depth, 5)
    depth = depth.astype(np.float32)
    depth = np.clip(depth, MIN_DEPTH, MAX_DEPTH)  # Clamp depth values to valid range
    depth = np.nan_to_num(depth, nan=DEFAULT_DEPTH)
    return depth

def detect_objects(image, yolo_model, conf_threshold=0.3):
    # Detect objects using YOLO
    results = yolo_model(image, conf=conf_threshold)
    detections = results[0].boxes.data.cpu().numpy()
    return detections

def detect_head(image, person_box, mtcnn):
    # Detect head using MTCNN (for facial landmarks)
    x1, y1, x2, y2 = map(int, person_box[:4])
    person_region = image[y1:y2, x1:x2]
    faces = mtcnn.detect_faces(person_region)
    if faces:
        face = faces[0]['box']
        landmarks = faces[0]['keypoints']
        try:
            nose = (landmarks['nose'][0] + x1, landmarks['nose'][1] + y1)
            mouth_left = (landmarks['mouth_left'][0] + x1, landmarks['mouth_left'][1] + y1)
            mouth_right = (landmarks['mouth_right'][0] + x1, landmarks['mouth_right'][1] + y1)
            mouth_mid_x = (mouth_left[0] + mouth_right[0]) / 2
            mouth_mid_y = (mouth_left[1] + mouth_right[1]) / 2
            chin_y = mouth_mid_y + (mouth_mid_y - nose[1])
            chin_x = mouth_mid_x
            chin = (int(chin_x), int(chin_y))
            head_height_pixels = chin[1] - nose[1]
            return head_height_pixels, (x1, y1, x2, y2), (nose, chin)
        except KeyError as e:
            print(f"Missing landmark: {e}")
            return None, (x1, y1, x2, y2), None
    else:
        return None, (x1, y1, x2, y2), None

def calculate_head_height(pixel_head_height, depth_head, focal_length_pixels):
    # Calculate the head height in cm using the formula
    head_height_m = (pixel_head_height * depth_head) / focal_length_pixels
    head_height_cm = head_height_m * 100  # Convert from meters to centimeters
    return head_height_cm

def process_image(image_path, yolo_model, midas_model, midas_transform, device, mtcnn):
    # Process the input image and estimate the person's height
    image = cv2.imread(image_path)
    if image is None:
        print(f"Error: Unable to load image {image_path}.")
        return None
    image_height, image_width, _ = image.shape
    
    # Detect objects in the image
    detections = detect_objects(image, yolo_model)
    person_detections = [d for d in detections if int(d[5]) == 0]  # Filter for person class (class 0)
    if not person_detections:
        print(f"No person detected in {image_path}.")
        return None

    # Choose the largest person detected (based on bounding box area)
    largest_person = max(person_detections, key=lambda f: (f[2] - f[0]) * (f[3] - f[1]))
    head_height_pixels, person_box, landmarks = detect_head(image, largest_person, mtcnn)
    if head_height_pixels is None:
        print("No head detected.")
        return None

    # Estimate depth using MiDaS
    depth_map = estimate_depth(image, midas_model, midas_transform, device)

    # Extract the depth at the head region
    depth_roi = depth_map[person_box[1]:person_box[3], person_box[0]:person_box[2]]
    depth_head = np.median(depth_roi)
    if depth_head < MIN_DEPTH or depth_head > MAX_DEPTH:
        print(f"Depth out of bounds ({depth_head:.2f} meters). Using default depth.")
        depth_head = DEFAULT_DEPTH

    # Calculate and return the estimated head height using depth
    head_height_cm_depth = calculate_head_height(head_height_pixels, depth_head, FOCAL_LENGTH_PIXEL)
    
    # Check for reference objects near the person (e.g., backpack, chair, etc.)
    reference_object_height_cm = None
    for detection in detections:
        if int(detection[5]) != 0:  # Not a person
            x1, y1, x2, y2 = map(int, detection[:4])
            # Check if the object overlaps with the person's bounding box
            if (x1 < person_box[2] and x2 > person_box[0] and
                y1 < person_box[3] and y2 > person_box[1]):
                # Known height of the reference object (e.g., backpack, chair, etc.)
                if int(detection[5]) == 24:  # Backpack class ID in YOLO
                    reference_object_height_real = 0.5  # Example: 0.5 meters (50 cm)
                else:
                    reference_object_height_real = 0.75  # Default height for other objects (e.g., chair)
                
                reference_object_height_pixels = y2 - y1
                depth_reference = np.median(depth_map[y1:y2, x1:x2])
                if depth_reference < MIN_DEPTH or depth_reference > MAX_DEPTH:
                    depth_reference = DEFAULT_DEPTH
                
                # Calculate head height using the reference object
                head_height_cm_reference = head_height_pixels * (reference_object_height_real / reference_object_height_pixels) * (depth_head / depth_reference)
                reference_object_height_cm = head_height_cm_reference * 100  # Convert to cm
                
                break

    if reference_object_height_cm is not None:
        # Return both depth-based and reference-based height estimates
        return head_height_cm_depth, reference_object_height_cm
    else:
        # Return only depth-based height estimate
        return head_height_cm_depth, None

def estimate_height(image_path):
    # Initialize YOLOv8, MiDaS, and MTCNN models
    yolo_model = YOLO("yolov8x.pt")
    midas_model, midas_transform, device = load_midas_model()
    mtcnn = MTCNN()
    
    # Process the image and return the estimated head height
    return process_image(image_path, yolo_model, midas_model, midas_transform, device, mtcnn)

