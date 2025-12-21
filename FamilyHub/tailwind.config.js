/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        family: {
          primary: "#FF9F43", // Warm Orange
          warm: "#FEF9E7", // Soft Cream
        },
      },
    },
  },
  plugins: [],
};
