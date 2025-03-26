import cv2
import torch
from detectron2.model_zoo import get_config_file, get_checkpoint_url
from detectron2.engine import DefaultPredictor
from detectron2.config import get_cfg
from detectron2.utils.visualizer import Visualizer
from detectron2.data import MetadataCatalog
import tempfile
import os


def detect_objects(image_path):
    """
    Detect objects in an image using Detectron2.

    Parameters:
        image_path (str): Path to the input image.

    Returns:
        tuple: A list of detected objects (each as a dictionary) and the path to the output image with visualizations.
    """
    # Check if the image file exists
    if not os.path.isfile(image_path):
        raise FileNotFoundError(f"Image at path {image_path} does not exist. Please check the file path.")

    # Load configuration and model weights
    cfg = get_cfg()
    cfg.merge_from_file(get_config_file("COCO-Detection/faster_rcnn_R_50_FPN_3x.yaml"))
    cfg.MODEL.WEIGHTS = get_checkpoint_url("COCO-Detection/faster_rcnn_R_50_FPN_3x.yaml")
    cfg.MODEL.DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

    # Initialize predictor
    predictor = DefaultPredictor(cfg)

    # Load image
    img = cv2.imread(image_path)

    # Check if the image was loaded successfully
    if img is None:
        raise ValueError(f"Image at path {image_path} could not be loaded. Please check the file format.")

    # Set confidence threshold
    confidence_threshold = 0.77  # Lower the threshold for better detection

    # Perform prediction
    outputs = predictor(img)

    # Filter instances based on confidence threshold
    instances = outputs["instances"]
    high_confidence_indices = instances.scores >= confidence_threshold
    filtered_instances = instances[high_confidence_indices]

    # Prepare results
    results = []
    output_image_path = None

    if len(filtered_instances) > 0:
        # Visualize predictions
        v = Visualizer(img[:, :, ::-1], MetadataCatalog.get(cfg.DATASETS.TRAIN[0]), scale=1.2)
        out = v.draw_instance_predictions(filtered_instances.to("cpu"))

        # Save the output image to a temporary file
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp_file:
            output_image_path = temp_file.name
            cv2.imwrite(output_image_path, out.get_image()[:, :, ::-1])

        # Get detected classes, scores, and bounding boxes
        classes = filtered_instances.pred_classes
        scores = filtered_instances.scores
        boxes = filtered_instances.pred_boxes
        metadata = MetadataCatalog.get(cfg.DATASETS.TRAIN[0])

        # Estimate object heights
        for cls, score, box in zip(classes, scores, boxes):
            class_name = metadata.thing_classes[cls.item()]
            # Calculate object height in pixels (bounding box height)
            box_height_pixels = box[3] - box[1]  # y2 - y1
            results.append({
                "object_name": class_name,
                "confidence_score": float(score.item()),
                "height_pixels": float(box_height_pixels),  # Height in pixels
            })

    return results, output_image_path


# Test the function
#
