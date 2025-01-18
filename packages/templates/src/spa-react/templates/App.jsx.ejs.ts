import { TemplateOptions } from '../..';

const content = `
import <% if (buildTool === 'webpack' %>React, <% } %>{ useState } from 'react';
<% const map = {stylus: 'styl', sass: 'scss', less: 'less', tailwindcss: 'css'}; %>
import './App.<%= map?.[cssProcessor] ?? 'css' %>';



function App() {
    const [count, setCount] = useState(0);
    return (
        <>
            <h1><%=  buildTool %> + React</h1>
            <button className="button" onClick={()=> setCount(count => count + 1)}>count is {count}</button>
        </>
    );
}

export default App;`;

export default (options: TemplateOptions) => ({
    content,
    outputPath: '/src/App.jsx',
    hide: options.language !== 'JavaScript',
});
