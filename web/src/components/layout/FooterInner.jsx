import Container from "@/components/layout/Container";

export default function FooterInner({ className = "", children }) {
  return <Container className={className}>{children}</Container>;
}
