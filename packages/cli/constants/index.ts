export const PROJECT_TYPES = ['spa', 'ssr', 'nodejs', 'toolkit', 'components', 'vanilla'];

export const TEMPLATES_LIST = ['spa-react-template'];

export const PROJECT_TYPE_FRAMES_MAP = {
    spa: ['vue', 'react', 'svelte', 'lit', 'preact', 'solid', 'alpine'],
    ssr: ['next', 'nuxt', 'astro', 'sveltekit'],
    nodejs: ['nest', 'egg'],
    vanilla: [],
    toolkit: [],
    components: ['vue', 'react', 'svelte'],
};

export const APP_PROJECT_BUILD_TOOLS = ['webpack', 'vite'];

export const TOOL_PROJECT_BUILD_TOOLS = ['gulp', 'rollup'];

export const APP_PROJECTS = ['spa', 'ssr', 'nodejs', 'vanilla'];

export const TOOL_PROJECTS = ['toolkit', 'components'];

export const NO_FRAME_TYPES = ['toolkit', 'vanilla'];

export const FRAME_TYPES = ['spa', 'ssr', 'nodejs', 'components'];

export const FRAMES = [
    'vue',
    'react',
    'svelte',
    'lit',
    'preact',
    'solid',
    'alpine',
    'next',
    'nuxt',
    'astro',
    'sveltekit',
    'nest',
    'egg',
];

export const CSS_PROCESSORS = ['sass', 'less', 'stylus', 'tailwindcss', 'css'];

export const LINT_TOOLS = [
    'eslint',
    'prettier',
    'stylelint',
    'commitlint',
    'markdownlint',
    'editorconfig',
];

export const DOC_FRAMES = ['vitepress'];

export const UNIT_TEST_TOOLS = ['vitest', 'jest'];

export const BUILD_TOOLS = ['webpack', 'gulp', 'rollup', 'vite', 'tsc'];

export const PACKAGE_TOOLS = ['npm', 'yarn', 'pnpm'];

export const ROUTER_MANAGEMENT_TOOLS = ['vue-router', 'react-router', 'svelte-routing'];

export const STORE_MANAGEMENT_TOOLS = ['pinia', 'vuex', 'redux', 'mobx', 'recoil', 'context'];

export const HTTP_TOOLS = ['axios'];

export const ORM_TOOLS = ['typeorm'];
