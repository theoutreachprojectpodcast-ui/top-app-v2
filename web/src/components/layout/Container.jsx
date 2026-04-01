export default function Container({ className = "", children }) {
  return <div className={`siteContainer ${className}`.trim()}>{children}</div>;
}

