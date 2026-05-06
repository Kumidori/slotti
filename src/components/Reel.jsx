import '../styles/Reel.css';

export default function Reel({ icon, spinning, highlight }) {
  const classes = ['reel'];
  if (spinning) classes.push('spinning');
  if (highlight) classes.push(highlight);

  return (
    <div className={classes.join(' ')}>
      {icon}
    </div>
  );
}
