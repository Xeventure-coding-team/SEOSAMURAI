export async function uploadToImageKit(
  file: Buffer,
  fileName: string
): Promise<string> {
  const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;

  if (!IMAGEKIT_PRIVATE_KEY) {
    throw new Error("ImageKit credentials not configured");
  }

  const formData = new FormData();

  formData.append(
    "file",
    new Blob([new Uint8Array(file)]),
    fileName
  );

  formData.append("fileName", fileName);
  formData.append("folder", "/blog/covers");

  const response = await fetch(
    "https://upload.imagekit.io/api/v1/files/upload",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${IMAGEKIT_PRIVATE_KEY}:`
        ).toString("base64")}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error("Failed to upload image to ImageKit");
  }

  const data = await response.json();

  return data.url;
}