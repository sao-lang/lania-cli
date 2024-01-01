export default `
const getBaseUrl = () => {
    <% if (buildTool === 'vite') { %>
    if (import.meta.env.ENV === 'development') {
        return 'development'
    }
    return 'production';
    <% } else { %>
    if (process.env.NODE_ENV === 'development') {
        return 'development'
    }
    return 'production';
    <% } %>
}`;
