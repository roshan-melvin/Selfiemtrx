# Key Formulas and Methods Used in Selfiemtrx

## 1. Head-to-Body Ratio Formula
Used to estimate total height:

$$
\text{Corrected Estimated Height} = \frac{\text{Estimated Head Height}}{\text{Head-to-Body Ratio}}
$$

## 2. Height Calculation Using Depth and Focal Length
Converts pixel head height to real-world height:

$$
\text{Head Height (cm)} = \frac{\text{Pixel Head Height} \times \text{Depth}}{\text{Focal Length (pixels)}} \times 100
$$

## 3. Reference Object-Based Height Estimation
Uses known object height for scaling:

$$
\text{Head Height (cm)} = \text{Pixel Head Height} \times \left(\frac{\text{Reference Object Real Height}}{\text{Reference Object Height (pixels)}}\right) \times \left(\frac{\text{Depth Head}}{\text{Depth Reference}}\right) \times 100
$$

## 4. Object Detection and Height Estimation
Object height in pixels:

$$
\text{Object Height (pixels)} = y_2 - y_1
$$

## 5. Machine Learning Methods Used
- DeepFace: Age, gender, emotion, race analysis
- Detectron2: Object detection
- YOLOv8: Object detection
- MiDaS: Depth estimation
- MTCNN: Face landmarks

## Additional Information

- Bounding box coordinates ($x_1$, $y_1$, $x_2$, $y_2$) are extracted from object detection models (YOLO, Detectron2).
- The ML pipeline processes images in real time, using Flask as the API backend.
- The app supports cross-platform deployment (Android, iOS, Web).
- Data privacy: Images are processed temporarily and deleted after analysis to ensure user privacy.
- Reference objects (e.g., backpack, chair) are used for scaling height estimates when available.

## Explanation of y₂ and y₁

In the formula:

$$
\text{Object Height (pixels)} = y_2 - y_1
$$

- $y_2$ is the lower (bottom) y-coordinate of the object's bounding box in the image.
- $y_1$ is the upper (top) y-coordinate of the object's bounding box in the image.

The difference $y_2 - y_1$ gives the height of the object in pixels, as measured from the top to the bottom of the bounding box.

---
These formulas and methods are central to the biometric and object analysis features of Selfiemtrx. For patent documentation, highlight these technical workflows and their integration.
