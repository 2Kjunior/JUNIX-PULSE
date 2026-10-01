// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
const tseslintPlugin = require("@typescript-eslint/eslint-plugin");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/*", "node_modules/*"],
  },
  {
    // Ce plugin doit etre redeclare ici car chaque objet de config ESLint 9
    // (flat config) est independant : les regles "@typescript-eslint/*"
    // utilisees plus bas ne sont visibles que dans les objets qui enregistrent
    // explicitement ce plugin, meme s'il est deja utilise par expoConfig.
    plugins: {
      "@typescript-eslint": tseslintPlugin,
    },
    rules: {
      // Reanimated shared values (.value = ...) sont mutables par conception
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/preserve-manual-memoization": "off",
      // Autorise les apostrophes et guillemets français dans le JSX
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_"
        }
      ],
    },
  },
]);
