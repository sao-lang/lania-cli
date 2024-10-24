export default `
{
    "name": "<%= name %>",
    "version": "1.0.0",
    "main": "index.js",
    "private": true,
    "scripts": {
        <% if (buildTool === 'webpack') { %>"analyzer": "npx webpack-bundle-analyzer ./dist/stats.json",<% } %>
        "dev": "lania dev",
        "build": "lania build"
    },
    "dependencies": {
        <% const dependenciesArray = Object.entries(dependencies); %>
        <% dependenciesArray.forEach(([key, value], index) => { -%>
            "<%= key %>": "<%= value %>"<% if(dependenciesArray.length - 1 !== index) { %>,<% } -%>
        <% }) -%>
    },
    "devDependencies": {
        <% const devDependenciesArray = Object.entries(devDependencies); %>
        <% devDependenciesArray.forEach(([key, value], index) => { -%>
            "<%= key %>": "<%= value %>"<% if(devDependenciesArray.length - 1 !== index) { %>,<% } -%>
        <% }) -%>
    }
}`;
