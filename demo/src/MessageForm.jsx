import {
  Dialog,
  IconButton,
  Pane,
  SendMessageIcon,
  Textarea,
  UploadIcon,
  toaster,
} from 'evergreen-ui';
import React from 'react';

const MessageForm = function ({ postMessage, postUpload }) {
  // the <input> for uploading files
  const fileInput = React.useRef(null);

  // the value of the <textarea> for posting new messages
  const [draft, setDraft] = React.useState('');

  // whether to show the upload preview <Dialog>
  const [showUploadPreview, setShowUploadPreview] = React.useState(false);

  // the src of the upload preview <img>
  const [uploadPreviewUrl, setUploadPreviewUrl] = React.useState('');

  // the alt of the upload preview <img>
  const [uploadPreviewAlt, setUploadPreviewAlt] = React.useState('');

  // called when the user submits a text message
  const submitText = function () {
    if (draft.length > 0) {
      postMessage({ text: draft }).catch((error) =>
        toaster.danger(error.message),
      );

      setDraft('');
    }
  };

  // called when the user submits an image or attachment message
  const submitUpload = function () {
    if (fileInput.current.files.length) {
      postUpload(fileInput.current.files[0])
        .then((upload) => postMessage({ uploadId: upload.id }))
        .catch((error) => toaster.danger(error.message))
        .finally(() => setShowUploadPreview(false));
    }
  };

  // called when the user presses the enter key
  const handleKeyUp = function (e) {
    if (e.key == 'Enter') {
      if (e.shiftKey) {
        setDraft(draft + '\n');
      } else {
        submitText();
      }
    }
  };

  // called when the user selects a file from the browser's file picker
  const handleFileInputChange = function () {
    if (fileInput.current.files.length) {
      setUploadPreviewUrl((prevUrl) => {
        if (prevUrl) {
          URL.revokeObjectURL(prevUrl);
        }

        return URL.createObjectURL(fileInput.current.files[0]);
      });

      setUploadPreviewAlt(fileInput.current.files[0].name);

      setShowUploadPreview(true);
    }
  };

  return (
    <Pane
      alignItems="flex-start"
      backgroundColor="#fff"
      bottom={0}
      display="flex"
      height={100}
      paddingLeft={32}
      position="fixed"
      width="calc(100vw - 300px)"
    >
      <input
        type="file"
        accept="application/pdf,image/*"
        name="upload"
        style={{ display: 'none' }}
        ref={fileInput}
        onChange={handleFileInputChange}
      />
      <Textarea
        value={draft}
        placeholder="Write a message or select a file to send using the button to the right"
        fontSize={14}
        onChange={(e) => setDraft(e.target.value)}
        onKeyUp={handleKeyUp}
      />
      <IconButton
        appearance="minimal"
        icon={draft.length ? SendMessageIcon : UploadIcon}
        marginTop={20}
        size="large"
        onClick={draft.length ? submitText : (e) => fileInput.current.click()}
      ></IconButton>

      <Dialog
        isShown={showUploadPreview}
        hasHeader={false}
        confirmLabel="Send"
        onCloseComplete={() => setShowUploadPreview(false)}
        onConfirm={submitUpload}
      >
        <div style={{ marginTop: 32 }}>
          <img
            src={uploadPreviewUrl}
            alt={uploadPreviewAlt}
            style={{ display: 'block', margin: 'auto' }}
          />
        </div>
      </Dialog>
    </Pane>
  );
};

export { MessageForm };
