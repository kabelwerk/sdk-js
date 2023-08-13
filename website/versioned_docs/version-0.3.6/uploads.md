# Uploads

An upload object has the following fields:

-   **`id`** → The upload's unique integer ID.
-   **`mimeType`** → The [MIME type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types) of the upload, e.g. "application/pdf" or "image/jpeg".
-   **`name`** → The name of the file uploaded by the user.
-   **`original`** → An object with information about the original file uploaded by the user.
    -   **`height`** → Height in pixels if the uploaded file is an image or `null` if it is not.
    -   **`url`** → URL for downloading the uploaded file.
    -   **`width`** → Width in pixels if the uploaded file is an image or `null` if it is not.
-   **`preview`** → An object with information about the upload's preview image. If the uploaded file is an image with either width or height > 500 pixels, then a scaled-down preview image is generated. If the uploaded file is an image of which both the height and width are ≤ 500 pixels, then the original file is used as a preview image. If the uploaded file is not an image file, then a thumbnail image is used.
    -   **`height`** → The height in pixels of the preview image; always ≤ 500.
    -   **`url`** → URL for downloading the preview image.
    -   **`width`** → The width in pixels of the preview image; always ≤ 500.

## See also

-   [Messages](./messages.md)
-   [Rooms](./rooms.md)
