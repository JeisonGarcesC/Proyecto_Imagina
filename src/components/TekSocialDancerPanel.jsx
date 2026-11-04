import DancerEditor from '../mepal/tekSocial/dancer/ui/DancerEditor.jsx';

export default function TekSocialDancerPanel({ threeApiRef, readOnly, country }) {
  return (
    <DancerEditor
      readOnly={readOnly}
      country={country}
      onApply={(config) => threeApiRef.current?.addTekSocialDancer?.(config)}
    />
  );
}
