import { client } from '@gradio/client';

export const tryOnGarment = async (personImage: string, garmentImage: string) => {
  try {
    // Initialize the client
    const app = await client("franciszzj/Leffa");
    
    // Function to handle both base64 and file paths
    const processImage = async (image: string, filename: string): Promise<File> => {
      if (image.startsWith('data:')) {
        // It's a base64 string
        return await base64ToFile(image, filename);
      } else {
        // It's a file path, fetch it and convert to File
        const response = await fetch(image);
        const blob = await response.blob();
        return new File([blob], filename, { type: blob.type });
      }
    };

    // Process both images
    const personFile = await processImage(personImage, 'person.jpg');
    const garmentFile = await processImage(garmentImage, 'garment.jpg');

    // Make the prediction
    const result = await app.predict("/leffa_predict_vt", [
      personFile,           // src_image
      garmentFile,         // ref_image
      false,              // ref_acceleration
      30,                 // step
      2.5,               // scale
      42,                // seed
      "viton_hd",        // vt_model_type
      "upper_body",      // vt_garment_type
      false,             // vt_repaint
    ]);

    console.log('Raw API result:', result);
    console.log('Result data type:', typeof result.data[0]);
    console.log('Result data:', result.data[0]);

    // Check if we have data
    if (!result.data || !result.data[0]) {
      throw new Error('No data received from API');
    }

    // Get the first result
    const imageResult = result.data[0];

    // If it's already a URL, return it
    if (typeof imageResult === 'string' && (imageResult.startsWith('data:') || imageResult.startsWith('blob:') || imageResult.startsWith('http'))) {
      return imageResult;
    }

    // If it's an object with a url property
    if (imageResult && typeof imageResult === 'object' && 'url' in imageResult) {
      return imageResult.url;
    }

    // If it's a base64 string without data: prefix
    if (typeof imageResult === 'string') {
      return `data:image/jpeg;base64,${imageResult}`;
    }

    // If it's a Blob or File
    if (imageResult instanceof Blob || imageResult instanceof File) {
      return URL.createObjectURL(imageResult);
    }

    // If it's an array buffer or similar
    if (imageResult.buffer || imageResult instanceof ArrayBuffer) {
      const blob = new Blob([imageResult], { type: 'image/jpeg' });
      return URL.createObjectURL(blob);
    }

    console.error('Unhandled result format:', imageResult);
    throw new Error(`Unhandled result format: ${typeof imageResult}`);
  } catch (error) {
    console.error('Error in virtual try-on:', error);
    throw error;
  }
};

// Helper function to convert base64 to File
const base64ToFile = async (base64String: string, filename: string): Promise<File> => {
  // Remove the data URL prefix if it exists
  const base64WithoutPrefix = base64String.includes('base64,') 
    ? base64String.split('base64,')[1] 
    : base64String;

  // Convert base64 to blob
  const byteString = atob(base64WithoutPrefix);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  const blob = new Blob([ab], { type: 'image/jpeg' });
  return new File([blob], filename, { type: 'image/jpeg' });
}; 