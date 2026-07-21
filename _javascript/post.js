import { basic, initTopbar, initSidebar } from './modules/layouts';

import {
  loadImg,
  imgPopup,
  initLocaleDatetime,
  initClipboard,
  initToc,
  loadMermaid,
  initCodeProtection
} from './modules/components';
import { initDynamicBlog } from './modules/dynamic/blog';

loadImg();
initToc();
imgPopup();
initSidebar();
initLocaleDatetime();
initClipboard();
initTopbar();
loadMermaid();
initCodeProtection();
initDynamicBlog();
basic();
