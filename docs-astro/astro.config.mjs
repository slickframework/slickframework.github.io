// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
    site: 'https://www.slick-framework.com',
    integrations: [starlight({
        title: 'Slick',
        logo: {
            dark: './src/assets/slick-logo-dark.svg',
            light: './src/assets/slick-logo-light.svg',
            replacesTitle: true,
        },
        social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/slickframework' }],
        sidebar: [
            { label: 'Getting Started', slug: 'getting-started' },
            { label: 'Configuration', slug: 'configuration' },
            { label: 'Dependency Injection', slug: 'dependency-injection' },
            { label: 'Modules', slug: 'modules' },
            {
                label: 'Security',
                autogenerate: { directory: 'security' },
            },
            {
                label: 'Modules',
                autogenerate: { directory: 'modules' },
            },
        ],
		}), mdx()],
});