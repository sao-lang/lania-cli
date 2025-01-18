const content = `
{
    "name": "<%= name %>",
    "type": "spa",
    "repository": "",
    "packageTool": "<%= packageTool %>",
    "lintTools": [],
    "cssProcessor":"<%= cssProcessor %>",
    "buildTool": "<%= buildTool %>",
    "frame": "react",
}`;

export default () => ({
    content,
    outputPath: '/lan.config.json',
});
