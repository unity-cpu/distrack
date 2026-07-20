export const metadata = {
  title: "gallery",
  description: "pics + descriptions",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
