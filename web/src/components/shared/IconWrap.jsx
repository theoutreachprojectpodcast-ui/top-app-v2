export default function IconWrap({ path }) {
  return (
    <span className="iconWrap" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="iconStroke">
        <path d={path} />
      </svg>
    </span>
  );
}

