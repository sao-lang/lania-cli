const content = `
<!doctype html>
<html lang="en">

    <head>
        <meta charset="UTF-8" />
        <!-- <link rel="icon" type="image/svg+xml" href="/vite.svg" /> -->
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>
            <%= name %>
        </title>
    </head>

    <body>
        <div id="root"></div>
        <% if (buildTool === 'vite') {  %>
            <script type="module" src="/src/main.tsx"></script>
        <% } %>
    </body>

</html>`;

export default () => ({
    content,
    outputPath: '/index.html',
});
