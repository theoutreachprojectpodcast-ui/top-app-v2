import Container from "@/components/layout/Container";

export default function HeaderInner({ className = "", children }) {
  return <Container className={className}>{children}</Container>;
}
