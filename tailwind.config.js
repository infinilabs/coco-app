import animate from "tailwindcss-animate";

export default {
  content: [
    "./index.html",
    "./src/**/*.{html,js,jsx,ts,tsx}",
    "./src/**/*.css",
  ],
  important: ".coco-container",
  theme: {
    extend: {
      backgroundColor: {
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        background: 'rgb(var(--color-background) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        separator: 'rgb(var(--color-separator) / <alpha-value>)'
      },
      backgroundImage: {
        chat_bg_light: "url('./assets/chat_bg_light.png')",
        chat_bg_dark: "url('./assets/chat_bg_dark.png')",
        search_bg_light: "url('./assets/search_bg_light.png')",
        search_bg_dark: "url('./assets/search_bg_dark.png')",
        inputbox_bg_light: "url('./assets/inputbox_bg_light.png')",
        inputbox_bg_dark: "url('./assets/inputbox_bg_dark.png')",
      },
      textColor: {
        primary: 'rgb(var(--color-foreground) / <alpha-value>)'
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-in-out',
        typing: 'typing 1.5s ease-in-out infinite',
        shake: 'shake 0.5s ease-in-out'
      },
      keyframes: {
        'fade-in': {
          '0%': {
            opacity: '0'
          },
          '100%': {
            opacity: '1'
          }
        },
        typing: {
          '0%': {
            opacity: '0.3'
          },
          '50%': {
            opacity: '1'
          },
          '100%': {
            opacity: '0.3'
          }
        },
        shake: {
          '0%, 100%': {
            transform: 'rotate(0deg)'
          },
          '25%': {
            transform: 'rotate(-20deg)'
          },
          '75%': {
            transform: 'rotate(20deg)'
          }
        }
      },
      boxShadow: {
        'window-custom': '0px 16px 32px 0px rgba(0,0,0,0.3)'
      },
      zIndex: {
        '100': '100',
        '1000': '1000',
        '2000': '2000'
      },
      screens: {
        mobile: {
          max: '679px'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        }
      }
    }
  },
  plugins: [animate],
  mode: "jit",
  darkMode: ["class", '[data-theme="dark"]'],
  safelist: ["bg-[green]", "bg-[red]", "bg-[yellow]"],
};
