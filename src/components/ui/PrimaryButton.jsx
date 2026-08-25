export default function PrimaryButton({
  children,
  className = "",
  variant = "primary",
  ...props
}) {
  const variantClasses = {
    primary: "bg-slate-950 text-white hover:bg-slate-800 focus:ring-slate-400",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:ring-slate-300",
    accent: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-400",
  };

  return (
    <button
      {...props}
      className={[
        "inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500",
        variantClasses[variant] || variantClasses.primary,
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
