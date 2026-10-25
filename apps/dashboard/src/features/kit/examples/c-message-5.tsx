import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@smartapp/ui/components/attachment';
import { Avatar, AvatarFallback, AvatarImage } from '@smartapp/ui/components/avatar';
import { Bubble, BubbleContent } from '@smartapp/ui/components/bubble';
import { Message, MessageAvatar, MessageContent } from '@smartapp/ui/components/message';
import { FileSpreadsheetIcon, DownloadIcon } from 'lucide-react';
import { useKitShop } from '../kit-shop.js';

/*
 * Requested at 448 square because the image variant crops to a square anyway.
 * A wide frame would pay for bytes that never reach a pixel.
 */
/*
 * An Attachment is a first-class child of MessageContent. It brings its own
 * border and per-style radius, and an end-aligned row pulls it to the end as
 * it pulls the bubble, so there is no panel to hand-roll.
 */
export function Pattern() {
  const shop = useKitShop();
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <Message align="end">
        <MessageAvatar>
          <Avatar>
            <AvatarImage src={shop.face(0)} alt="Sarah Chen" />
            <AvatarFallback>SC</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          {/*
            The tile is 120px wide by default, and a plain w-full beats that:
            the style sheets sit in the base layer, utilities in the utilities
            layer, and layer order outranks specificity.
          */}
          <Attachment orientation="vertical" className="w-full max-w-56">
            <AttachmentMedia variant="image">
              <img
                src={shop.photo(1)}
                alt="Gradient artwork for the release banner"
                width={448}
                height={448}
                loading="lazy"
                decoding="async"
              />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>hero-gradient.png</AttachmentTitle>
              <AttachmentDescription>PNG, 212 KB</AttachmentDescription>
            </AttachmentContent>
          </Attachment>
          <Bubble>
            <BubbleContent>
              Here is the new release banner. Can you send the palette over?
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>

      <Message>
        <MessageAvatar>
          <Avatar>
            <AvatarImage src={shop.face(1)} alt="Michael Rodriguez" />
            <AvatarFallback>MR</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <Bubble variant="muted">
            <BubbleContent>Exported, one row per token.</BubbleContent>
          </Bubble>
          <Attachment>
            <AttachmentMedia>
              <FileSpreadsheetIcon aria-hidden="true" />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>palette-tokens.csv</AttachmentTitle>
              <AttachmentDescription>CSV, 184 KB</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              {/*
                The label names the file. A thread of identical download glyphs
                is otherwise a list of buttons all called "Download".
              */}
              <AttachmentAction
                type="button"
                variant="secondary"
                size="icon-sm"
                aria-label="Download palette-tokens.csv"
                title="Download"
              >
                <DownloadIcon aria-hidden="true" />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
        </MessageContent>
      </Message>
    </div>
  );
}
