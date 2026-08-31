// Library-local subset of the app's ICONS map: only the assets that the
// extracted components reference. Same export name and path shape as the app's
// src/constants/icons.ts so component imports stay unchanged.
import userCircle from '../assets/icons/user-circle.svg';
import copyIcon from '../assets/icons/copy-icon.svg';
import menuIcon from '../assets/icons/menu.svg';
import moreVerticalIcon from '../assets/icons/more-vertical.svg';
import altArrowLeft from '../assets/icons/alt-arrow-left.svg';
import closeIcon from '../assets/icons/close.svg';

export const ICONS = {
  USER_CIRCLE: userCircle,
  COPY: copyIcon,
  MENU: menuIcon,
  MORE_VERTICAL: moreVerticalIcon,
  ALT_ARROW_LEFT: altArrowLeft,
  CLOSE: closeIcon,
};
