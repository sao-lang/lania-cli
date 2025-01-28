import { LangEnum, TemplateOptions } from '@lania-cli/types';

const content = `
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
<% const map = {stylus: 'styl', sass: 'scss', less: 'less', tailwindcss: 'css'}; %>
import './index.<%= map?.[cssProcessor] ?? 'css' %>';

<% if (cssProcessor === 'tailwindcss') { %>import './tailwind.css'<% } %>

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);`;
export default (options: TemplateOptions) => ({
    content,
    outputPath: '/main.jsx',
    hide: options.language !== LangEnum.JavaScript,
});
