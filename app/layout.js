import './globals.css';

export const metadata = {
  title:       'SymptomAI — Disease Predictor',
  description: 'AI-powered disease prediction from your symptoms',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        {/* puter.js: free AI, key-value storage, and auth — no API key needed */}
        <script src="https://js.puter.com/v2/" async />
      </head>
      <body>{children}</body>
    </html>
  );
}
