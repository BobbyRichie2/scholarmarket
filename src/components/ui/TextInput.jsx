export default function TextInput({
  label,
  className = "",
  inputClassName = "",
  wrapperClassName = "",
  ...props
}) {
  const commonInputClasses = [
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
    inputClassName,
  ].join(" ");

  const field = (
    <input
      {...props}
      className={commonInputClasses}
    />
  );

  if (!label) return field;

  return (
    <label className={['block text-sm font-medium text-slate-700', wrapperClassName].join(' ')}>
      <span className="mb-2 block">{label}</span>
      {field}
    </label>
  );
}
