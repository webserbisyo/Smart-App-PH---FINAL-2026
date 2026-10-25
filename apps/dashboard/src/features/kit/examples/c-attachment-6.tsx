import { formatBytes, useFileUpload } from './hooks/use-file-upload';

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from '@smartapp/ui/components/attachment';
import { UploadIcon, FileIcon, XIcon } from 'lucide-react';

const ICON_UPLOAD = <UploadIcon aria-hidden="true" />;

const ICON_FILE = <FileIcon aria-hidden="true" />;

const ICON_REMOVE = <XIcon aria-hidden="true" />;

export function Pattern() {
  // The hook enforces the count and size limits and is what fills the errors
  // array below. Nothing here uploads: no endpoint, no submit button, so the
  // example cannot pretend to send what it has collected.
  const [{ files, errors }, { removeFile, openFileDialog, getInputProps }] = useFileUpload({
    multiple: true,
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024,
    accept: 'image/*,.pdf,.csv',
  });

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-2">
      {/*
       * The picker is an attachment rather than a box around one: state="idle"
       * draws the dashed border and the card's own focus-within ring puts
       * keyboard focus somewhere visible instead of on an invisible overlay.
       */}
      <Attachment state="idle" className="w-full">
        <AttachmentMedia>{ICON_UPLOAD}</AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>Choose files</AttachmentTitle>
          <AttachmentDescription>Images, PDF or CSV, up to 10 MB each</AttachmentDescription>
        </AttachmentContent>
        <AttachmentTrigger
          type="button"
          aria-haspopup="dialog"
          aria-label="Choose files to attach"
          onClick={openFileDialog}
        />
        {/*
         * The input stays in the accessibility tree as sr-only with
         * tabIndex={-1}: a display:none input cannot be opened by the hook,
         * and a second tab stop over the same action would only be noise.
         */}
        <input
          {...getInputProps()}
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose files to attach"
        />
      </Attachment>

      {errors.length > 0 ? (
        <p className="text-xs text-destructive" role="alert">
          {errors[0]}
        </p>
      ) : null}

      {files.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {files.map((entry) => (
            <Attachment key={entry.id} state="idle" size="sm" className="w-full">
              {entry.file.type.startsWith('image/') && entry.preview ? (
                <AttachmentMedia variant="image">
                  {/*
                   * The preview carries alt="" on purpose: the filename sits
                   * beside it, and a second announcement of the same file is
                   * noise rather than information.
                   */}
                  <img
                    src={entry.preview}
                    alt=""
                    width={64}
                    height={64}
                    loading="lazy"
                    decoding="async"
                  />
                </AttachmentMedia>
              ) : (
                <AttachmentMedia>{ICON_FILE}</AttachmentMedia>
              )}
              <AttachmentContent>
                <AttachmentTitle>{entry.file.name}</AttachmentTitle>
                <AttachmentDescription>{formatBytes(entry.file.size)}</AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                {/*
                 * removeFile is what revokes an image preview's object URL, so
                 * nothing here needs an effect to clean up after itself.
                 */}
                <AttachmentAction
                  type="button"
                  aria-label={`Remove ${entry.file.name}`}
                  onClick={() => removeFile(entry.id)}
                >
                  {ICON_REMOVE}
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          No files chosen yet.
        </p>
      )}
    </div>
  );
}
