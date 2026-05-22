import React from 'react';
import { createSystem, defaultConfig, ChakraProvider } from '@chakra-ui/react';

const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#f1f5f0' },
          100: { value: '#d8e2dc' },
          200: { value: '#cbd5c0' },
          500: { value: '#4a6741' },
          600: { value: '#384d31' },
          700: { value: '#2d3a28' },
        },
      },
    },
    semanticTokens: {
      colors: {
        primary: { value: '{colors.brand.500}' },
        accent: { value: '#a3b18a' },
      },
    },
  },
});

export function ChakraAppProvider({ children }) {
  return (
    <ChakraProvider value={system}>
      {children}
    </ChakraProvider>
  );
}

