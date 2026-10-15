import { app } from '@wix/astro/builders';
import myPage from './extensions/dashboard/pages/my-page/my-page.extension.ts';

import customizedPackageBuilder from './extensions/site/widgets/customized-package-builder/customized-package-builder.extension.ts';

export default app()
  .use(myPage).use(customizedPackageBuilder);
