// Library-local subset of the app's ICONS map: only the assets that the
// extracted components reference. Same export name and path shape as the app's
// src/constants/icons.ts so component imports stay unchanged.
import userCircle from '../assets/icons/user-circle.svg';
import copyIcon from '../assets/icons/copy-icon.svg';
import menuIcon from '../assets/icons/menu.svg';
import moreVerticalIcon from '../assets/icons/more-vertical.svg';
import altArrowLeft from '../assets/icons/alt-arrow-left.svg';
import altArrowRight from '../assets/icons/alt-arrow-right.svg';
import closeIcon from '../assets/icons/close.svg';
import searchIcon from '../assets/icons/search.svg';
import documentIcon from '../assets/icons/document.svg';
import downloadIcon from '../assets/icons/download.svg';
import sendIcon from '../assets/icons/send-icon.svg';
import refreshIcon from '../assets/icons/refresh-icon.svg';
import gitForkIcon from '../assets/icons/git-fork.svg';
import inputTokensIcon from '../assets/icons/input-tokens.svg';
import outputTokensIcon from '../assets/icons/output-tokens.svg';
import totalTokensIcon from '../assets/icons/total-tokens.svg';
import cacheTokensIcon from '../assets/icons/cache-tokens.svg';
import brainIcon from '../assets/icons/brain.svg';
import imageAttachmentIcon from '../assets/icons/image-attachment-icon.svg';
import attachmentIcon from '../assets/icons/attachment.svg';
import infoIcon from '../assets/icons/info.svg';
import trashIcon from '../assets/icons/trash.svg';

export const ICONS = {
  USER_CIRCLE: userCircle,
  COPY: copyIcon,
  MENU: menuIcon,
  MORE_VERTICAL: moreVerticalIcon,
  ALT_ARROW_LEFT: altArrowLeft,
  ALT_ARROW_RIGHT: altArrowRight,
  CLOSE: closeIcon,
  SEARCH: searchIcon,
  DOCUMENT: documentIcon,
  DOWNLOAD: downloadIcon,
  SEND: sendIcon,
  REFRESH_ICON: refreshIcon,
  GIT_FORK: gitForkIcon,
  INPUT_TOKENS: inputTokensIcon,
  OUTPUT_TOKENS: outputTokensIcon,
  TOTAL_TOKENS: totalTokensIcon,
  CACHE_TOKENS: cacheTokensIcon,
  BRAIN: brainIcon,
  IMAGE_ATTACHMENT: imageAttachmentIcon,
  ATTACHMENT: attachmentIcon,
  INFO: infoIcon,
  TRASH: trashIcon,
};
