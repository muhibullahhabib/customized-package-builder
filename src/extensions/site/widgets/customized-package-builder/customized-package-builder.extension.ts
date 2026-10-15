import { extensions } from '@wix/astro/builders'

export default extensions.customElement({
  id: '39cf2b0c-2532-4a07-9bca-2fa6b6c90f83',
  name: 'Customized Package Builder',
  width: {
    defaultWidth: 450,
    allowStretch: true
  },
  height: {
    defaultHeight: 250
  },
  installation: {
    autoAdd: true
  },
  presets: [
    {
      id: 'b22b030d-5963-4285-a426-0d6908989267',
      name: 'default',
      thumbnailUrl: '{{BASE_URL}}/customized-package-builder-thumbnail.png',
    },
  ],
  
  tagName: 'customized-package-builder',
  element: './extensions/site/widgets/customized-package-builder/customized-package-builder.tsx',
  settings: './extensions/site/widgets/customized-package-builder/customized-package-builder.panel.tsx',
});
