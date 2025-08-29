/* eslint-env node */
module.exports = {
    root: true,
    extends: [
        'plugin:vue/vue3-strongly-recommended',
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 'latest'
    },
    rules: {
        "indent": ["error", 4],
        "vue/html-indent": ["error", 4],
        "vue/multi-word-component-names": ["error", {
            "ignores": ["Build", "Expander", "Container"]
        }]
    }
}
