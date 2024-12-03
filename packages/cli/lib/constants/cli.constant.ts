import text from '@utils/text';

export const PROJECT_TYPES = ['spa', 'ssr', 'nodejs', 'toolkit', 'components', 'vanilla'];

// export const TEMPLATES_LIST = ['spa-react-template'];

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

export const LINTERS = ['eslint', 'prettier', 'stylelint'];

export const DOC_FRAMES = ['vitepress'];

export const UNIT_TEST_TOOLS = ['vitest', 'jest'];

export const BUILD_TOOLS = ['webpack', 'gulp', 'rollup', 'vite', 'tsc'];

export const PACKAGE_TOOLS = ['npm', 'yarn', 'pnpm'];

export const ROUTER_MANAGEMENT_TOOLS = ['vue-router', 'react-router', 'svelte-routing'];

export const STORE_MANAGEMENT_TOOLS = ['pinia', 'vuex', 'redux', 'mobx', 'recoil', 'context'];

export const HTTP_TOOLS = ['axios'];

export const ORM_TOOLS = ['typeorm'];

export const ADD_NEW_REMOTE_CHOICE = 'add new remote';

export const DEFAULT_GSYNC_NORMATIVELY_RULES = [
    { value: 'feat', name: 'feat:     新功能' },
    { value: 'fix', name: 'fix:      修复' },
    { value: 'docs', name: 'docs:     文档变更' },
    { value: 'style', name: 'style:    代码格式(不影响代码运行的变动)' },
    { value: 'refactor', name: 'refactor: 重构(既不是增加feature，也不是修复bug)' },
    { value: 'perf', name: 'perf:     性能优化' },
    { value: 'test', name: 'test:     增加测试' },
    { value: 'chore', name: 'chore:    构建过程或辅助工具的变动' },
    { value: 'revert', name: 'revert:   回退' },
    { value: 'build', name: 'build:    打包' },
];
