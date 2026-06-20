// src/app/[locale]/(protected)/niqo/layout.tsx
export default function NiqoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="niqo-layout hidden" aria-hidden="true" />
      {children}
    </>
  );
}
