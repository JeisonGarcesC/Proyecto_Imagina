import LinkEditor from '../mepal/link/ui/LinkEditor.jsx';

export default function LinkPanel({ threeApiRef, readOnly }) {
  return (
    <LinkEditor
      readOnly={readOnly}
      onApply={(config) => threeApiRef.current?.addLink?.(config)}
    />
  );
}
