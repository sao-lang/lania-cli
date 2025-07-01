export default `
<%
    const name = 'MyComponent';
    function toLang(processor) {
        const map = {
        css: '',
        sass: 'scss',
        stylus: 'styl',
        less: 'less',
        };
        return map[processor] || '';
    }
    const langAttr = toLang(cssProcessor);
%>
<template>
    <div></div>
</template>
<script>
export default {
    props: {},
    data() {
        return {
        };
    },
    computed: {
    },
    watch: {
    },
    created() {
    },
    mounted() {
    },
    methods: {
    },
};
</script>
<style<% if (langAttr) { %> lang="<%= langAttr %>"<% } %>></style>
`;
